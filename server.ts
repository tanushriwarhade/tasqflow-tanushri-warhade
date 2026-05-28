import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  colorTag: string;
  userId: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  dueDate: string;
  assigneeName: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory caching for stats endpoint mimicking Redis
interface CacheEntry {
  timestamp: number;
  data: any;
}

const DB_FILE = path.join(process.cwd(), "server_db.json");
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// Initialize simple local database
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const freshDb = { users: [], projects: [], tasks: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(freshDb, null, 2));
    return freshDb;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (err) {
    return { users: [], projects: [], tasks: [] };
  }
}

function saveDb(data: { users: User[]; projects: Project[]; tasks: Task[] }) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Redis Caching Simulation
let statsCache: { [projectId: string]: CacheEntry } = {};

function invalidateStatsCache(projectId?: string) {
  if (projectId) {
    delete statsCache[projectId];
  } else {
    statsCache = {};
  }
}

// Helper: Hashing passwords with sha256
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Helper: Create simulated HS256 JWT
function generateToken(user: User): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours expiry
    })
  ).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
    
  return `${header}.${payload}.${signature}`;
}

// Helper: Verify simulated HS256 JWT
function verifyToken(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const computedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
      
    if (computedSig !== signature) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) return null; // Expired
    
    return decodedPayload;
  } catch (e) {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Global Error Wrapper
  const asyncHandler = (fn: express.RequestHandler) => 
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  // Auth Middleware
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) {
      res.status(401).json({ error: "Access token required" });
      return;
    }
    
    const user = verifyToken(token);
    if (!user) {
      res.status(403).json({ error: "Invalid or expired access token" });
      return;
    }
    
    (req as any).user = user;
    next();
  };

  // --- API ROUTES ---

  // Auth: Register
  app.post("/api/v1/auth/register", asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }
    
    // Simple Email Regex validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }
    
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const db = loadDb();
    if (db.users.find((u: User) => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(409).json({ error: "User already exists with this email" });
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDb(db);

    const token = generateToken(newUser);
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  }));

  // Auth: Login
  app.post("/api/v1/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken(user);
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  }));

  // Projects: List
  app.get("/api/v1/projects", authenticateToken, asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const db = loadDb();
    const userProjects = db.projects.filter((p: Project) => p.userId === user.id);
    res.status(200).json(userProjects);
  }));

  // Projects: Create
  app.post("/api/v1/projects", authenticateToken, asyncHandler(async (req, res) => {
    const { name, description, colorTag } = req.body;
    const user = (req as any).user;
    
    if (!name) {
      res.status(400).json({ error: "Project name is required" });
      return;
    }

    const db = loadDb();
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description: description || "",
      colorTag: colorTag || "#3b82f6",
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    db.projects.push(newProject);
    saveDb(db);
    res.status(201).json(newProject);
  }));

  // Projects: Delete (with cascade tasks deletion)
  app.delete("/api/v1/projects/:id", authenticateToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;

    const db = loadDb();
    const projectIndex = db.projects.findIndex((p: Project) => p.id === id && p.userId === user.id);
    
    if (projectIndex === -1) {
      res.status(404).json({ error: "Project not found or unauthorized" });
      return;
    }

    // Cascade delete tasks corresponding to this project
    db.projects.splice(projectIndex, 1);
    db.tasks = db.tasks.filter((t: Task) => t.projectId !== id);
    
    saveDb(db);
    invalidateStatsCache(id);
    
    res.status(200).json({ message: "Project and associated tasks deleted successfully" });
  }));

  // Tasks: List for Project
  app.get("/api/v1/projects/:id/tasks", authenticateToken, asyncHandler(async (req, res) => {
    const { id: projectId } = req.params;
    const user = (req as any).user;

    const db = loadDb();
    // Validate project ownership
    const project = db.projects.find((p: Project) => p.id === projectId && p.userId === user.id);
    if (!project) {
      res.status(404).json({ error: "Project not found or unauthorized" });
      return;
    }

    const projectTasks = db.tasks.filter((t: Task) => t.projectId === projectId);
    res.status(200).json(projectTasks);
  }));

  // Tasks: Create for Project
  app.post("/api/v1/projects/:id/tasks", authenticateToken, asyncHandler(async (req, res) => {
    const { id: projectId } = req.params;
    const { title, description, priority, dueDate, assigneeName } = req.body;
    const user = (req as any).user;

    if (!title) {
      res.status(400).json({ error: "Task title is required" });
      return;
    }

    const db = loadDb();
    // Validate project ownership
    const project = db.projects.find((p: Project) => p.id === projectId && p.userId === user.id);
    if (!project) {
      res.status(404).json({ error: "Project not found or unauthorized" });
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      description: description || "",
      priority: priority || "MEDIUM",
      status: "TODO",
      dueDate: dueDate || "",
      assigneeName: assigneeName || "",
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.tasks.push(newTask);
    saveDb(db);
    invalidateStatsCache(projectId);

    res.status(201).json(newTask);
  }));

  // Tasks: Patch (updates properties of a task)
  app.patch("/api/v1/tasks/:id", authenticateToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, priority, status, dueDate, assigneeName } = req.body;
    const user = (req as any).user;

    const db = loadDb();
    const taskIndex = db.tasks.findIndex((t: Task) => t.id === id);
    if (taskIndex === -1) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const task = db.tasks[taskIndex];
    // Validate containing project belongs to user
    const project = db.projects.find((p: Project) => p.id === task.projectId && p.userId === user.id);
    if (!project) {
      res.status(403).json({ error: "Unauthorized access to this task's project" });
      return;
    }

    // Apply updates
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assigneeName !== undefined) task.assigneeName = assigneeName;
    task.updatedAt = new Date().toISOString();

    db.tasks[taskIndex] = task;
    saveDb(db);
    invalidateStatsCache(task.projectId);

    res.status(200).json(task);
  }));

  // Tasks: Delete
  app.delete("/api/v1/tasks/:id", authenticateToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;

    const db = loadDb();
    const taskIndex = db.tasks.findIndex((t: Task) => t.id === id);
    if (taskIndex === -1) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const task = db.tasks[taskIndex];
    // Validate project ownership
    const project = db.projects.find((p: Project) => p.id === task.projectId && p.userId === user.id);
    if (!project) {
      res.status(403).json({ error: "Unauthorized access to this task" });
      return;
    }

    db.tasks.splice(taskIndex, 1);
    saveDb(db);
    invalidateStatsCache(task.projectId);

    res.status(200).json({ message: "Task deleted successfully" });
  }));

  // Dashboard / Analytics Stats (with simulated Redis TTL: 60s)
  app.get("/api/v1/projects/:id/stats", authenticateToken, asyncHandler(async (req, res) => {
    const { id: projectId } = req.params;
    const user = (req as any).user;

    const db = loadDb();
    const project = db.projects.find((p: Project) => p.id === projectId && p.userId === user.id);
    if (!project) {
      res.status(404).json({ error: "Project not found or unauthorized" });
      return;
    }

    // Redis simulation logic checking cache expiration
    const now = Date.now();
    const cached = statsCache[projectId];
    
    if (cached && now - cached.timestamp < 60000) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached.data);
      return;
    }

    // Cache MISS, compute fresh stats
    const tasks = db.tasks.filter((t: Task) => t.projectId === projectId);
    
    const statusCounts = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    let overdueCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    tasks.forEach((t: Task) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
      if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++;
      
      // Determine if overdue
      if (t.status !== "DONE" && t.dueDate) {
        const dueStr = t.dueDate.split("T")[0];
        if (dueStr < todayStr) {
          overdueCount++;
        }
      }
    });

    const statsResult = {
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

    // Store in Redis Simulator cache
    statsCache[projectId] = {
      timestamp: now,
      data: statsResult,
    };

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(statsResult);
  }));

  // --- ERROR HANDLER MIDDLEWARE ---
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express App Error Handles: ", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected error occurred on the server",
    });
  });

  // Serve static assets or mount Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tasqflow container server is running at http://localhost:${PORT}`);
  });
}

startServer();
