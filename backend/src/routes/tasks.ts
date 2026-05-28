import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, CustomIncomingRequest } from "../middlewares/auth";
import { redisClient } from "../config/redis";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().datetime({ message: "Due Date must be a valid ISO Date String" }).optional().nullable(),
  assigneeName: z.string().optional(),
});

const patchTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeName: z.string().optional(),
});

// Helper: Expire cache on change
async function invalidateCache(projectId: string) {
  try {
    if (redisClient.isOpen) {
      await redisClient.del(`stats:${projectId}`);
    }
  } catch (err) {
    console.warn("Pragmatic Cache invalidate pass: ", err);
  }
}

// GET /api/v1/projects/:id/tasks
router.get("/projects/:id/tasks", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Confirm project rights
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found or unauthorized access" });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json(tasks);
  } catch (err) {
    console.error("List Project Tasks Error: ", err);
    return res.status(500).json({ error: "Server error displaying tasks list" });
  }
});

// POST /api/v1/projects/:id/tasks
router.post("/projects/:id/tasks", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const projectId = req.params.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found or unauthorized access" });
    }

    const payload = createTaskSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten().fieldErrors });
    }

    const { title, description, priority, dueDate, assigneeName } = payload.data;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        status: "TODO",
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeName,
        projectId,
      },
    });

    await invalidateCache(projectId);

    return res.status(201).json(task);
  } catch (err) {
    console.error("Catalog Task Error: ", err);
    return res.status(500).json({ error: "Server error cataloging pipeline task" });
  }
});

// PATCH /api/v1/tasks/:id
router.patch("/tasks/:id", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const taskId = req.params.id;

    // Grab task and verify ownership
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.project.userId !== userId) {
      return res.status(404).json({ error: "Task not found or unauthorized access" });
    }

    const payload = patchTaskSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten().fieldErrors });
    }

    const updateData: any = {};
    const data = payload.data;

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.assigneeName !== undefined) updateData.assigneeName = data.assigneeName;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await invalidateCache(task.projectId);

    return res.status(200).json(updatedTask);
  } catch (err) {
    console.error("Modify Task Error: ", err);
    return res.status(500).json({ error: "Server error saving task updates" });
  }
});

// DELETE /api/v1/tasks/:id
router.delete("/tasks/:id", authenticateToken, async (req: CustomIncomingRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const taskId = req.params.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.project.userId !== userId) {
      return res.status(404).json({ error: "Task not found or unauthorized access" });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    await invalidateCache(task.projectId);

    return res.status(200).json({ message: "Task removed safely from Kanban pipeline" });
  } catch (err) {
    console.error("Remove Task Error: ", err);
    return res.status(500).json({ error: "Server error deleting board task" });
  }
});

export default router;
