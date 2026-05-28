import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import taskRoutes from "./routes/tasks";
import { connectRedis } from "./config/redis";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to Redis Engine
connectRedis();

// Security and Request Parsers
app.use(helmet());
app.use(cors({
  origin: "*", // Configure according to client deployment specifications
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Main Router Assemblies
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1", taskRoutes); // Nested route prefixes like /api/v1/tasks under task routes file

// Server Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// JSON fallback endpoint
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "API Endpoint URL requested is not defined" });
});

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global Catch error handles: ", err);
  res.status(err.status || 500).json({
    error: err.message || "A catastrophic error occurred on the API server",
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Tasqflow Solid-State pipeline API running at http://localhost:${PORT}`);
  });
}

export default app;
