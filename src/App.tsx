import React, { useState, useEffect } from "react";
import {
  Trello,
  PieChart,
  Folder,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  User,
  LogOut,
  Clock,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  CheckCircle,
  X,
  FileText,
  Bookmark,
  Share2,
  Layers,
  Search,
  Activity,
  Database,
  RefreshCw,
  MoreVertical,
  CheckSquare
} from "lucide-react";
import { Project, Task, ProjectStats, TaskPriority, TaskStatus } from "./types";

// Dynamic Simple Toast System
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function App() {
  // Authentication State
  const [token, setToken] = useState<string | null>(localStorage.getItem("tasqflow_token"));
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem("tasqflow_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Auth Inputs
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Application State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [cacheHeader, setCacheHeader] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Modals / Dialogs Opens
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<Task | null>(null);

  // Input States
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjColor, setNewProjColor] = useState("#3b82f6");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [editTaskStatus, setEditTaskStatus] = useState<TaskStatus>("TODO");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskAssignee, setEditTaskAssignee] = useState("");

  // UI state filters
  const [activeTab, setActiveTab] = useState<"kanban" | "analytics">("kanban");
  const [taskSearch, setTaskSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast Stack
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show Toast Wrapper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Check Local Expiration or Auto Session
  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
      fetchStats(selectedProjectId);
    } else {
      setTasks([]);
      setStats(null);
    }
  }, [selectedProjectId]);

  // Network Fetch Options
  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // --- API OPERATIONS ---

  // Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }

      localStorage.setItem("tasqflow_token", data.token);
      localStorage.setItem("tasqflow_user", JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      showToast(`Welcome to Tasqflow, ${data.user.name}!`, "success");
    } catch (err: any) {
      setAuthError(err.message);
      showToast(err.message, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to login");
      }

      localStorage.setItem("tasqflow_token", data.token);
      localStorage.setItem("tasqflow_user", JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      showToast(`Welcome back, ${data.user.name}!`, "success");
    } catch (err: any) {
      setAuthError(err.message);
      showToast(err.message, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("tasqflow_token");
    localStorage.removeItem("tasqflow_user");
    setToken(null);
    setCurrentUser(null);
    setProjects([]);
    setSelectedProjectId("");
    setTasks([]);
    setStats(null);
    showToast("Signed out successfully", "info");
  };

  // Fetch Projects List
  const fetchProjects = async () => {
    setGlobalLoading(true);
    try {
      const response = await fetch("/api/v1/projects", {
        headers: getHeaders(),
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (err: any) {
      showToast("Could not contact server API", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    try {
      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: newProjName,
          description: newProjDesc,
          colorTag: newProjColor,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setProjects((prev) => [...prev, data]);
        setSelectedProjectId(data.id);
        setNewProjName("");
        setNewProjDesc("");
        setIsCreateProjectOpen(false);
        showToast(`Project "${data.name}" created successfully!`, "success");
      } else {
        showToast(data.error || "Could not construct project", "error");
      }
    } catch (err) {
      showToast("Error creating project", "error");
    }
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Are you sure? This will delete the project and CASCADE delete all tasks!")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (response.ok) {
        const remaining = projects.filter((p) => p.id !== projectId);
        setProjects(remaining);
        if (selectedProjectId === projectId) {
          setSelectedProjectId(remaining.length > 0 ? remaining[0].id : "");
        }
        showToast("Project coordinates and all tasks wiped cleanly", "success");
      } else {
        const errData = await response.json();
        showToast(errData.error || "Unable to wipe project", "error");
      }
    } catch (err) {
      showToast("Error deleting project", "error");
    }
  };

  // Fetch Tasks for Project
  const fetchTasks = async (projId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projId}/tasks`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setTasks(data);
      }
    } catch (err) {
      showToast("Failed to fetch project workspace tasks", "error");
    }
  };

  // Fetch Stats (with cache TTL validation check)
  const fetchStats = async (projId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projId}/stats`, {
        headers: getHeaders(),
      });
      const cacheVal = response.headers.get("X-Cache");
      setCacheHeader(cacheVal);
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      showToast("Failed to retrieve dashboard analytics info", "error");
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`/api/v1/projects/${selectedProjectId}/tasks`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          priority: newTaskPriority,
          dueDate: newTaskDueDate,
          assigneeName: newTaskAssignee,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTasks((prev) => [...prev, data]);
        // Fast invalidate stats
        fetchStats(selectedProjectId);
        setIsCreateTaskOpen(false);

        // Reset Inputs
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskPriority("MEDIUM");
        setNewTaskDueDate("");
        setNewTaskAssignee("");

        showToast("Task cataloged successfully", "success");
      } else {
        showToast(data.error || "Failed to catalog task", "error");
      }
    } catch (err) {
      showToast("Network error cataloging task", "error");
    }
  };

  // Trigger Edit Task Open
  const handleOpenEditTaskModal = (task: Task) => {
    setSelectedTaskToEdit(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description);
    setEditTaskPriority(task.priority);
    setEditTaskStatus(task.status);
    setEditTaskDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setEditTaskAssignee(task.assigneeName);
    setIsEditTaskOpen(true);
  };

  // Save Edited Task
  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskToEdit) return;

    try {
      const response = await fetch(`/api/v1/tasks/${selectedTaskToEdit.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          title: editTaskTitle,
          description: editTaskDesc,
          priority: editTaskPriority,
          status: editTaskStatus,
          dueDate: editTaskDueDate,
          assigneeName: editTaskAssignee,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
        fetchStats(selectedProjectId);
        setIsEditTaskOpen(false);
        setSelectedTaskToEdit(null);
        showToast("Task modified successfully", "success");
      } else {
        showToast(data.error || "Failed to update task info", "error");
      }
    } catch (err) {
      showToast("Error updating task", "error");
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Confirm task deletion?")) return;

    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        fetchStats(selectedProjectId);
        showToast("Task removed cleanly", "success");
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Could not delete task", "error");
      }
    } catch (err) {
      showToast("Network failure deleting task", "error");
    }
  };

  // --- KANBAN DRAG & DROP ENGINE ---

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove || taskToMove.status === targetStatus) return;

    // Optimistic UI updates
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updatedAt: new Date().toISOString() } : t))
    );

    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to persist position");
      }
      // Sync DB fresh state
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
      fetchStats(selectedProjectId);
    } catch (err: any) {
      // Revert optimistic state back on failure
      fetchTasks(selectedProjectId);
      showToast(err.message || "Failed to shift task status", "error");
    }
  };

  // Helpers: Color priority flags
  const getPriorityStyles = (p: TaskPriority) => {
    switch (p) {
      case "LOW":
        return "bg-slate-100 text-slate-600 border-slate-200/60";
      case "MEDIUM":
        return "bg-blue-105/70 text-blue-800 border-blue-200/50";
      case "HIGH":
        return "bg-orange-105/70 text-orange-800 border-orange-200/50";
      case "CRITICAL":
        return "bg-red-105/80 text-red-800 border-red-200/50 animate-pulse";
      default:
        return "bg-slate-50 text-slate-600";
    }
  };

  // Helper: Overdue assessment
  const isOverdue = (dueDateStr: string, status: TaskStatus) => {
    if (status === "DONE" || !dueDateStr) return false;
    const today = new Date().toISOString().split("T")[0];
    const due = dueDateStr.split("T")[0];
    return due < today;
  };

  // Match current active filter projects
  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Filter and search tasks array
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (t.assigneeName && t.assigneeName.toLowerCase().includes(taskSearch.toLowerCase()));
    const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Split tasks into relevant Kanban arrays
  const columns: { title: string; code: TaskStatus; bg: string; text: string }[] = [
    { title: "To Do", code: "TODO", bg: "bg-white border-slate-200/60", text: "text-slate-500" },
    { title: "In Progress", code: "IN_PROGRESS", bg: "bg-white border-slate-200/60", text: "text-blue-650" },
    { title: "In Review", code: "IN_REVIEW", bg: "bg-white border-slate-200/60", text: "text-orange-550" },
    { title: "Done", code: "DONE", bg: "bg-white border-slate-200/60", text: "text-emerald-600" },
  ];

  return (
    <div className="absolute inset-0 bg-[#f8fafc] flex flex-col font-sans overflow-hidden select-none">
      
      {/* Toast Alert stack rendering */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-64 max-w-sm p-4 rounded-xl shadow-lg border text-sm flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100 pointer-events-auto ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : t.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-sky-50 border-sky-200 text-sky-800"
            }`}
          >
            <CheckSquare className="w-5 h-5 shrink-0" />
            <div className="flex-1 font-medium">{t.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {!token ? (
        // AUTHENTICATION SPLASH SCREEN CARD
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-950 text-white overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/10">
                <Trello className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold font-display tracking-tight text-white bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                tasqflow
              </span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white font-display">
                {isRegisterMode ? "Create an account" : "Welcome back"}
              </h2>
              <p className="text-slate-400 text-sm mt-1.5">
                {isRegisterMode ? "Get started with team pipeline workspaces" : "Sign in to access your task flowboards"}
              </p>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full text-sm bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-sm bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : isRegisterMode ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-800 pt-6">
              <button
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setAuthError("");
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {isRegisterMode ? "Already cataloged? Sign in instead" : "Need workspace entry? Register here"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // PROTECTED CONTENT DASHBOARD / WORK ENVIRONMENT
        <div className="flex-1 flex overflow-hidden relative">
          {/* MOBILE SIDEBAR DRAWERS OVERLAY */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              {/* Backdrop focus blur overlay */}
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
              
              {/* Sidebar drawer content container */}
              <aside className="relative flex flex-col w-64 max-w-[280px] bg-[#0f172a] text-slate-300 h-full shadow-2xl transition-transform duration-300 ease-out z-50 animate-in slide-in-from-left duration-300">
                {/* BRAND HEADER */}
                <div className="p-6 border-b border-[#1e293b]/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span className="font-bold text-xl tracking-tight text-white font-display">
                      tasqflow
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* PROJECTS CATALOG */}
                <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4">
                  <div className="flex items-center justify-between mb-4 px-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Projects Catalog
                    </span>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsCreateProjectOpen(true);
                      }}
                      className="p-1 hover:bg-white/10 text-slate-450 hover:text-white rounded transition-colors"
                      title="Create new project space"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {globalLoading && projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center">
                      <p className="text-xs text-slate-500 mb-3">No project constructed.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {projects.map((p) => {
                        const isSelected = p.id === selectedProjectId;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                              isSelected ? "bg-white/15 text-white font-semibold flex-1" : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span
                                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: p.colorTag }}
                              ></span>
                              <span className="truncate">{p.name}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsMobileMenuOpen(false);
                                handleDeleteProject(p.id);
                              }}
                              className="p-1 rounded opacity-100 hover:bg-white/10 text-slate-500 transition-all ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* USER LOGGED IN CARD INFO */}
                <div className="p-4 border-t border-[#1e293b]/50 bg-[#0b101c]/80 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3 overflow-hidden w-full">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-inner border border-slate-700">
                      {currentUser?.name[0].toUpperCase() || "T"}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-xs font-semibold truncate text-white leading-tight">{currentUser?.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{currentUser?.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="p-1.5 rounded-md hover:bg-white/10 hover:text-rose-500 text-slate-500 transition-colors shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* DESKTOP SIDEBAR NAVIGATION WORKSPACES */}
          <aside className="w-60 bg-[#0f172a] border-r border-[#1e293b]/50 hidden md:flex flex-col shrink-0 text-slate-300 select-none">
            {/* BRAND HEADER */}
            <div className="p-6 border-b border-[#1e293b]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <span className="font-bold text-xl tracking-tight text-white font-display">
                  tasqflow
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 font-bold border border-white/5">
                v1.0
              </span>
            </div>

            {/* PROJECTS BLOCK DESCRIPTOR */}
            <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4">
              <div className="flex items-center justify-between mb-4 px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Projects Catalog
                </span>
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="p-1 hover:bg-white/10 text-slate-450 hover:text-white rounded transition-colors"
                  title="Create new project space"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {globalLoading && projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-medium">Cataloging tags...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center">
                  <p className="text-xs text-slate-500 mb-3">No project workspace constructed yet.</p>
                  <button
                    onClick={() => setIsCreateProjectOpen(true)}
                    className="w-full text-xs py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Build first project
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {projects.map((p) => {
                    const isSelected = p.id === selectedProjectId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                          isSelected ? "bg-white/15 text-white font-semibold" : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: p.colorTag }}
                          ></span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(p.id);
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-rose-450 text-slate-500 transition-all"
                          title="Delete Project Space"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LOGGED IN USER CARD INFO */}
            <div className="p-4 border-t border-[#1e293b]/50 bg-[#0b101c]/80 mt-auto flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden w-full">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-inner border border-slate-700">
                  {currentUser?.name[0].toUpperCase() || "T"}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-semibold truncate text-white leading-tight">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{currentUser?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-white/10 hover:text-rose-500 text-slate-500 transition-colors shrink-0"
                  title="Log Out Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* MAIN CHANNELS ENVIRONMENT */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc] relative">
            {activeProject ? (
              <>
                {/* ACTIVE PROJECT PANEL HEADER */}
                <header className="px-4 md:px-6 py-4 bg-white border-b border-slate-200 shadow-sm shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="overflow-hidden flex items-center gap-3 w-full md:w-auto">
                    {/* Hamburguer trigger button for mobile menu drawer */}
                    <button
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="p-1 px-2 md:hidden text-slate-600 hover:bg-slate-100/80 rounded-lg shrink-0 transition-all border border-slate-250/70 flex items-center gap-1 cursor-pointer"
                      title="Show workspaces menu"
                    >
                      <Trello className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold text-slate-700">Menu</span>
                    </button>

                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-2 pb-0.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: activeProject.colorTag }}
                        ></span>
                        <h1 className="text-lg md:text-xl font-bold font-display tracking-tight text-slate-900 truncate">
                          {activeProject.name}
                        </h1>
                      </div>
                      <p className="text-[11px] md:text-xs text-slate-500 truncate max-w-xl">
                        {activeProject.description || "No description compiled"}
                      </p>
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex items-center gap-3 justify-between w-full md:w-auto shrink-0">
                    {/* Visual Segment Tabs */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                      <button
                        onClick={() => setActiveTab("kanban")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          activeTab === "kanban"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-550 hover:text-slate-800"
                        }`}
                      >
                        <Trello className="w-3.5 h-3.5 text-blue-500" />
                        <span className="hidden sm:inline">Kanban Board</span>
                        <span className="inline sm:hidden">Board</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("analytics");
                          fetchStats(activeProject.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          activeTab === "analytics"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-550 hover:text-slate-800"
                        }`}
                      >
                        <PieChart className="w-3.5 h-3.5 text-orange-500" />
                        <span className="hidden sm:inline">Analytics</span>
                        <span className="inline sm:hidden">Stats</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsCreateTaskOpen(true)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Task
                    </button>
                  </div>
                </header>

                {/* VIEW CONTROLS (ONLY SEARCH OR REFRESH ON KANBAN) */}
                {activeTab === "kanban" && (
                  <div className="px-4 md:px-6 py-3 bg-white border-b border-slate-100 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          placeholder="Search tasks, descriptions..."
                          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-blue-500 rounded-lg outline-none transition-colors"
                        />
                      </div>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100/50 px-3 py-1.5 rounded-lg outline-none cursor-pointer transition-colors text-slate-600 font-medium"
                      >
                        <option value="ALL">All Priorities</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>

                    <div className="text-xs text-slate-500 font-mono flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/50 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Showing {filteredTasks.length} elements
                    </div>
                  </div>
                )}

                {/* KANBAN BOARD SCREEN */}
                {activeTab === "kanban" && (
                  <div className="flex-1 overflow-x-auto p-4 md:p-8 overflow-y-hidden scrollbar-thin">
                    <div className="flex md:grid md:grid-cols-4 gap-4 md:gap-6 h-full min-w-full md:min-w-[960px] snap-x snap-mandatory">
                      {columns.map((col) => {
                        const colTasks = filteredTasks.filter((t) => t.status === col.code);
                        return (
                          <div
                            key={col.code}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.code)}
                            className="flex flex-col h-full gap-3 min-w-[270px] sm:min-w-[320px] md:min-w-0 flex-1 snap-center"
                          >
                            <div className="flex items-center justify-between px-1 mb-2">
                              <span className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  col.code === "TODO" ? "bg-slate-400" :
                                  col.code === "IN_PROGRESS" ? "bg-blue-500" :
                                  col.code === "IN_REVIEW" ? "bg-orange-500" : "bg-emerald-500"
                                }`}></span>
                                {col.title}
                              </span>
                              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {colTasks.length}
                              </span>
                            </div>

                            {/* Column task items container */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin pb-4">
                              {colTasks.length === 0 ? (
                                <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center p-3 text-slate-400 text-xs">
                                  Drag items here
                                </div>
                              ) : (
                                colTasks.map((task) => {
                                  const overdue = isOverdue(task.dueDate, task.status);
                                  return (
                                    <div
                                      key={task.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, task.id)}
                                      className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group select-none transition-all duration-200 ${
                                        overdue ? "border-rose-300 ring-2 ring-rose-100/50" : "border-slate-200"
                                      }`}
                                    >
                                      {/* Header priority & commands */}
                                      <div className="flex items-start justify-between mb-2">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getPriorityStyles(task.priority)}`}>
                                          {task.priority}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => handleOpenEditTaskModal(task)}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                                            title="Edit Task"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition"
                                            title="Delete Task"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Title */}
                                      <h3 className="font-semibold text-sm text-slate-900 pb-1 leading-snug">
                                        {task.title}
                                      </h3>

                                      {/* Description */}
                                      {task.description && (
                                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-3">
                                          {task.description}
                                        </p>
                                      )}

                                      {/* Footer due date & assignee */}
                                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                                        <div className="flex items-center gap-1 truncate max-w-[110px]">
                                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="truncate">{task.assigneeName || "Unassigned"}</span>
                                        </div>

                                        {task.dueDate && (
                                          <div className={`flex items-center gap-1 shrink-0 ${overdue ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
                                            <Calendar className="w-3 h-3 shrink-0" />
                                            <span>
                                              {overdue && <span className="animate-pulse mr-1">⚠️</span>}
                                              {new Date(task.dueDate).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                              })}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DASHBOARD ANALYTICS SCREEN */}
                {activeTab === "analytics" && (
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Header stats metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Stat summary cards */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Total Pipeline
                          </span>
                          <span className="text-3xl font-bold font-display text-slate-900">
                            {stats?.totalTasks ?? 0}
                          </span>
                        </div>
                        <div className="p-3.5 bg-blue-50 text-blue-650 rounded-2xl">
                          <Trello className="w-7 h-7" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Overdue Alerts
                          </span>
                          <span className={`text-3xl font-bold font-display ${stats?.overdueTasks && stats.overdueTasks > 0 ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
                            {stats?.overdueTasks ?? 0}
                          </span>
                        </div>
                        <div className={`p-3.5 rounded-2xl ${stats?.overdueTasks && stats.overdueTasks > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-450"}`}>
                          <Clock className="w-7 h-7" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Cache Status
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              cacheHeader === "HIT" ? "bg-emerald-50 text-emerald-800 border-emerald-250" : "bg-amber-50 text-amber-800 border-amber-250"
                            }`}>
                              {cacheHeader || "PENDING"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block">Redis TTL</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                          <Database className="w-5.5 h-5.5" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Engine Integrity
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-600">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>CONNECTED</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                          <Activity className="w-5.5 h-5.5" />
                        </div>
                      </div>
                    </div>

                    {/* Chart visualizations grids */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* STATS BY STATUS VISUAL SVG GRAPH */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                          <h3 className="font-bold text-slate-900 font-display">Tasks status pipeline</h3>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Metrics</span>
                        </div>

                        {stats?.totalTasks && stats.totalTasks > 0 ? (
                          <div className="space-y-5">
                            {/* Interactive custom visual representation for status */}
                            {stats.byStatus.map((item) => {
                              const percentage = stats.totalTasks > 0 ? (item.value / stats.totalTasks) * 100 : 0;
                              return (
                                <div key={item.code} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-700">{item.name}</span>
                                    <span className="text-slate-550">{item.value} tasks ({percentage.toFixed(0)}%)</span>
                                  </div>
                                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                    <div
                                      className={`h-full transition-all duration-550 rounded-full ${
                                        item.code === "TODO" ? "bg-slate-400" :
                                        item.code === "IN_PROGRESS" ? "bg-blue-500" :
                                        item.code === "IN_REVIEW" ? "bg-amber-400" : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            Construct sandbox tasks to trigger status flow charts
                          </div>
                        )}
                      </div>

                      {/* STATS BY PRIORITY PANEL GRAPH */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                          <h3 className="font-bold text-slate-900 font-display">Tasks priority distribution</h3>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Allocation</span>
                        </div>

                        {stats?.totalTasks && stats.totalTasks > 0 ? (
                          <div className="flex items-center justify-around gap-4 h-52">
                            {/* Elegant CSS bar charting for priorities */}
                            {stats.byPriority.map((item) => {
                              const percentage = stats.totalTasks > 0 ? (item.value / stats.totalTasks) * 100 : 0;
                              return (
                                <div key={item.code} className="flex flex-col items-center gap-2 h-full justify-end group">
                                  <div className="relative bottom-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {item.value} tasks
                                  </div>
                                  <div className="w-12 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden h-[120px] flex items-end">
                                    <div
                                      className={`w-full transition-all duration-500 ${
                                        item.code === "LOW" ? "bg-slate-350" :
                                        item.code === "MEDIUM" ? "bg-sky-400" :
                                        item.code === "HIGH" ? "bg-amber-500" : "bg-rose-500"
                                      }`}
                                      style={{ height: `${percentage || 4}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[11px] font-semibold text-slate-600 block mt-1">{item.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            No prioritize data available for this project workspace
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // WELCOME BANNER/CHOOSE PROJECT PROMPT IF NONE CONSTRUCTED
              <div className="flex-1 flex flex-col h-full bg-[#f8fafc] w-full">
                {/* Mobile upper action bar when no workspace selected */}
                <div className="px-4 py-3 border-b bg-white border-slate-200 shadow-sm shrink-0 flex items-center md:hidden justify-between w-full">
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-1 px-2.5 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0 transition-all border border-slate-250 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trello className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-700">Projects Menu</span>
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-400">tasqflow v1.0</span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
                  <div className="p-4 bg-blue-50/80 text-blue-600 rounded-2xl mb-4">
                    <Layers className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">No active workspace</h2>
                  <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                    Tasqflow workspaces host task flowboards, kanban column configurations, caching trackers, and pipeline metrics. Activate a workspace from the menu or construct a new one.
                  </p>
                  <button
                    onClick={() => setIsCreateProjectOpen(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-slate-900/15 cursor-pointer"
                  >
                    Construct new workspace project
                  </button>
                </div>
              </div>
            )}

            {/* Visual Polish Footer Info */}
            <div className="absolute bottom-3 right-6 pointer-events-none flex items-center gap-2.5 text-[10px] font-mono text-slate-400 select-none bg-[#f8fafc]/80 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-200/40 shadow-xs z-10">
              <span>v1.0.4-stable</span>
              <span className="w-1 h-1 rounded-full bg-slate-350"></span>
              <span>Response Time: 12ms</span>
              {cacheHeader && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-350"></span>
                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${
                    cacheHeader === "HIT"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-250"
                      : "bg-amber-100 text-amber-800 border-amber-250"
                  }`}>
                    X-Cache: {cacheHeader}
                  </span>
                </>
              )}
            </div>
          </main>
        </div>
      )}

      {/* --- BACKEND AND FRONTEND CONFIG DIALOG MODALS --- */}

      {/* 1. construct project modal */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setIsCreateProjectOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg font-display text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Create Project Space
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Q3 Release, SaaS Platform"
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-4 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Describe coordinates..."
                  rows={3}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-4 py-2.5 rounded-xl outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Color Identification tag</label>
                <div className="flex gap-2">
                  {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"].map((col) => (
                    <button
                      type="button"
                      key={col}
                      onClick={() => setNewProjColor(col)}
                      className={`w-7 h-7 rounded-lg relative cursor-pointer outline-none transition-all ${
                        newProjColor === col ? "scale-110 shadow-md ring-2 ring-slate-800" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {newProjColor === col && (
                        <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. construct task modal */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setIsCreateTaskOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 "
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg font-display text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Construct pipeline task
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-4 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Task description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Brief context..."
                  rows={3}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-4 py-2.5 rounded-xl outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Assignee</label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    placeholder="User name"
                    className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Priority Label</label>
                <div className="grid grid-cols-4 gap-2">
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setNewTaskPriority(p as TaskPriority)}
                      className={`py-1.5 border text-xs font-semibold rounded-lg transition ${
                        newTaskPriority === p
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-sm rounded-xl transition"
                >
                  Catalog Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. modify/edit task dialog */}
      {isEditTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => {
                setIsEditTaskOpen(false);
                setSelectedTaskToEdit(null);
              }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg font-display text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Modify pipeline task
            </h3>

            <form onSubmit={handleSaveEditedTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-4 py-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Task description</label>
                <textarea
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-4 py-2.5 rounded-xl outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Assignee</label>
                  <input
                    type="text"
                    value={editTaskAssignee}
                    onChange={(e) => setEditTaskAssignee(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editTaskDueDate}
                    onChange={(e) => setEditTaskDueDate(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 px-3 py-2 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value as TaskStatus)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none text-slate-700 cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Priority</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as TaskPriority)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none text-slate-700 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-sm rounded-xl transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
