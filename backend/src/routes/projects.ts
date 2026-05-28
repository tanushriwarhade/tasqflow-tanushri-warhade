import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, CustomIncomingRequest } from "../middlewares/auth";
import { redisClient } from "../config/redis";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  colorTag: z.string().startsWith("#", "ColorTag must be a valid HEX color code").optional(),
});

// GET /api/v1/projects
router.get("/", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(projects);
  } catch (err) {
    console.error("List Projects Error: ", err);
    return res.status(500).json({ error: "Server error retrieving project catalog" });
  }
});

// POST /api/v1/projects
router.post("/", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized access context" });

    const payload = projectSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten().fieldErrors });
    }

    const { name, description, colorTag } = payload.data;
    const project = await prisma.project.create({
      data: {
        name,
        description,
        colorTag: colorTag || "#3b82f6",
        userId,
      },
    });

    return res.status(201).json(project);
  } catch (err) {
    console.error("Create Project Error: ", err);
    return res.status(500).json({ error: "Server error constructing new project" });
  }
});

// DELETE /api/v1/projects/:id (Cascades tasks deletion)
router.delete("/:id", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const projectId = req.params.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found or unauthorized access" });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    // Invalidate project stats cache in Redis
    try {
      if (redisClient.isOpen) {
        await redisClient.del(`stats:${projectId}`);
      }
    } catch {
      // Graceful failover
    }

    return res.status(200).json({ message: "Project and cascade task trees purged successfully" });
  } catch (err) {
    console.error("Purge Project Error: ", err);
    return res.status(500).json({ error: "Server error deleting workspace project" });
  }
});

// GET /api/v1/projects/:id/stats with Redis TTL Caching
router.get("/:id/stats", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found or unauthorized access" });
    }

    const cacheKey = `stats:${projectId}`;

    // 1. Attempt Cache retrieve
    try {
      if (redisClient.isOpen) {
        const cachedContent = await redisClient.get(cacheKey);
        if (cachedContent) {
          res.setHeader("X-Cache", "HIT");
          return res.status(200).json(JSON.parse(cachedContent));
        }
      }
    } catch (cacheErr) {
      console.warn("Pragmatic Redis Cache bypass during query execution: ", cacheErr);
    }

    // 2. Cache MISS - Compute statistics
    const tasks = await prisma.task.findMany({
      where: { projectId },
    });

    const statusCounts = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    let overdueCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    tasks.forEach((t) => {
      if (t.status in statusCounts) statusCounts[t.status as keyof typeof statusCounts]++;
      if (t.priority in priorityCounts) priorityCounts[t.priority as keyof typeof priorityCounts]++;

      if (t.status !== "DONE" && t.dueDate) {
        const dueStr = t.dueDate.toISOString().split("T")[0];
        if (dueStr < todayStr) {
          overdueCount++;
        }
      }
    });

    const statsReport = {
      totalTasks: tasks.length,
      overdueTasks: overdueCount,
      byStatus: [
        { name: "To Do", value: statusCounts.TODO, code: "TODO" },
        { name: "In Progress", value: statusCounts.IN_PROGRESS, code: "IN_PROGRESS" },
        { name: "In Review", value: statusCounts.IN_REVIEW, code: "IN_REVIEW" },
        { name: "Done", value: statusCounts.DONE, code: "DONE" },
      ],
      byPriority: [
        { name: "Low", value: priorityCounts.LOW, code: "LOW" },
        { name: "Medium", value: priorityCounts.MEDIUM, code: "MEDIUM" },
        { name: "High", value: priorityCounts.HIGH, code: "HIGH" },
        { name: "Critical", value: priorityCounts.CRITICAL, code: "CRITICAL" },
      ]
    };

    // 3. Save to Redis with 60s TTL
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, 60, JSON.stringify(statsReport));
      }
    } catch (cacheStoreErr) {
      // Graceful failover
    }

    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(statsReport);
  } catch (err) {
    console.error("Compute Stats Error: ", err);
    return res.status(500).json({ error: "Server error calculating project dashboard stats" });
  }
});

export default router;
