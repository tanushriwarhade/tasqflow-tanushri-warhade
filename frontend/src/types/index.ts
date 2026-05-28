export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  colorTag: string;
  userId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  assigneeName?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatItem {
  name: string;
  value: number;
  code: string;
}

export interface ProjectStats {
  totalTasks: number;
  overdueTasks: number;
  byStatus: StatItem[];
  byPriority: StatItem[];
}
