"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { DndContext, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import {
  Trello,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  User,
  LogOut,
  Clock,
  LayoutGrid,
  BarChart,
  Grid,
  CheckCircle,
  X,
  PlusCircle,
  CheckSquare
} from "lucide-react";
import { Project, Task, TaskPriority, TaskStatus } from "@/src/types";

// Helper component: Draggable item representing standard task card
function DraggableTaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: (t: Task) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
      }
    : undefined;

  // Evaluate overdue task status
  const overdue = (() => {
    if (task.status === "DONE" || !task.dueDate) return false;
    const today = new Date().toISOString().split("T")[0];
    const due = task.dueDate.split("T")[0];
    return due < today;
  })();

  const getPriorityStyle = (p: TaskPriority) => {
    switch (p) {
      case "LOW": return "bg-slate-100 text-slate-700 border-slate-200";
      case "MEDIUM": return "bg-blue-50 text-blue-700 border-blue-200";
      case "HIGH": return "bg-amber-50 text-amber-700 border-amber-200";
      case "CRITICAL": return "bg-rose-50 text-rose-700 border-rose-200 border-2";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${
        isDragging ? "opacity-40" : ""
      } ${overdue ? "border-rose-400 ring-4 ring-rose-105" : "border-slate-100"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getPriorityStyle(task.priority)}`}>
          {task.priority}
        </span>
        
        {/* Drag trigger controls */}
        <div className="flex items-center gap-1.5">
          <div {...listeners} {...attributes} className="cursor-grab p-1 text-slate-350 hover:text-slate-500 hover:bg-slate-50 rounded" title="Drag Handle">
            <Grid className="w-3.5 h-3.5" />
          </div>
          <button onClick={() => onEdit(task)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-800 leading-snug">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-slate-450 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate max-w-[100px]">{task.assigneeName || "Unassigned"}</span>
        </div>

        {task.dueDate && (
          <div className={`flex items-center gap-1 ${overdue ? "text-rose-600 font-bold" : "text-slate-400"}`}>
            <Calendar className="w-3 h-3 shrink-0" />
            <span>
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable Column structure
function DroppableKanbanColumn({ status, title, tasks, onEdit, onDelete }: { status: TaskStatus; title: string; tasks: Task[]; onEdit: (t: Task) => void; onDelete: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 flex flex-col h-full ${
        isOver ? "bg-slate-100/70 border-slate-300" : "bg-slate-50/70 border-slate-200/55"
      }`}
    >
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50 mb-4 font-semibold text-slate-800">
        <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            status === "TODO" ? "bg-slate-400" :
            status === "IN_PROGRESS" ? "bg-blue-500" :
            status === "IN_REVIEW" ? "bg-amber-400" : "bg-emerald-500"
          }`}></span>
          {title}
        </span>
        <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-250 rounded-xl p-4 bg-white/40">
            Empty pipeline column
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  // Modals state
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form states
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projColor, setProjColor] = useState("#3b82f6");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editStatus, setEditStatus] = useState<TaskStatus>("TODO");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  useEffect(() => {
    const savedToken = localStorage.getItem("tasqflow_token");
    const userString = localStorage.getItem("tasqflow_user");

    if (!savedToken) {
      window.location.href = "/";
    } else {
      setToken(savedToken);
      setCurrentUser(userString ? JSON.parse(userString) : null);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/projects`, getHeaders());
      setProjects(res.data);
      if (res.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    try {
      const res = await axios.post(`${getApiUrl()}/projects`, {
        name: projName,
        description: projDesc,
        colorTag: projColor,
      }, getHeaders());

      setProjects((p) => [...p, res.data]);
      setSelectedProjectId(res.data.id);
      setIsProjModalOpen(false);
      setProjName("");
      setProjDesc("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Purge workspace project completely? Cascade deletes all tasks!")) return;

    try {
      await axios.delete(`${getApiUrl()}/projects/${id}`, getHeaders());
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      if (selectedProjectId === id) {
        setSelectedProjectId(remaining.length > 0 ? remaining[0].id : "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async (projId: string) => {
    try {
      const res = await axios.get(`${getApiUrl()}/projects/${projId}/tasks`, getHeaders());
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const res = await axios.post(`${getApiUrl()}/projects/${selectedProjectId}/tasks`, {
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        assigneeName: taskAssignee,
      }, getHeaders());

      setTasks((t) => [...t, res.data]);
      setIsTaskModalOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskPriority("MEDIUM");
      setTaskDueDate("");
      setTaskAssignee("");
    } catch (err) {
      console.error(err);
    }
  };

  const triggeredEditModal = (t: Task) => {
    setSelectedTask(t);
    setEditTitle(t.title);
    setEditDesc(t.description || "");
    setEditPriority(t.priority);
    setEditStatus(t.status);
    setEditDueDate(t.dueDate ? t.dueDate.split("T")[0] : "");
    setEditAssignee(t.assigneeName || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const res = await axios.patch(`${getApiUrl()}/tasks/${selectedTask.id}`, {
        title: editTitle,
        description: editDesc,
        priority: editPriority,
        status: editStatus,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        assigneeName: editAssignee,
      }, getHeaders());

      setTasks((t) => t.map((item) => (item.id === selectedTask.id ? res.data : item)));
      setIsEditModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Confirm card elimination?")) return;
    try {
      await axios.delete(`${getApiUrl()}/tasks/${id}`, getHeaders());
      setTasks((t) => t.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const nextStatus = over.id as TaskStatus;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === nextStatus) return;

    // Optimistic rendering update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus, updatedAt: new Date().toISOString() } : t))
    );

    try {
      await axios.patch(`${getApiUrl()}/tasks/${taskId}`, { status: nextStatus }, getHeaders());
    } catch (err) {
      // Revert state
      fetchTasks(selectedProjectId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tasqflow_token");
    localStorage.removeItem("tasqflow_user");
    window.location.href = "/";
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      
      {/* Sidebar layouts */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trello className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-lg text-white font-display">tasqflow</span>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Workspaces</span>
            <button onClick={() => setIsProjModalOpen(true)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((p) => {
              const selected = p.id === selectedProjectId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition ${
                    selected ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.colorTag }}></span>
                    <span className="truncate">{p.name}</span>
                  </div>
                  <button onClick={(e) => handleDeleteProject(p.id, e)} className="p-1 rounded text-slate-500 hover:text-rose-450 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div className="truncate">
            <h5 className="text-sm font-bold text-white truncate">{currentUser?.name || "Member Name"}</h5>
            <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 hover:bg-slate-800 text-slate-450 hover:text-rose-400 rounded-lg">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeProject ? (
          <>
            <header className="px-6 py-4 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeProject.colorTag }}></span>
                  {activeProject.name}
                </h1>
                {activeProject.description && <p className="text-xs text-slate-500 mt-0.5">{activeProject.description}</p>}
              </div>

              <div className="flex items-center gap-3">
                <nav className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-0.5">
                  <button className="px-3 py-1 bg-white text-slate-800 text-xs font-semibold rounded shadow-sm">
                    Kanban
                  </button>
                  <button onClick={() => window.location.href = `/dashboard/stats?project=${selectedProjectId}`} className="px-3 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded">
                    Analytics
                  </button>
                </nav>

                <button onClick={() => setIsTaskModalOpen(true)} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm">
                  <PlusCircle className="w-3.5 h-3.5" /> Launch Task
                </button>
              </div>
            </header>

            {/* DND CONTEXT BOARD */}
            <div className="flex-1 overflow-x-auto p-6">
              <DndContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-4 gap-4 h-full min-w-[960px]">
                  <DroppableKanbanColumn status="TODO" title="To Do" tasks={tasks.filter((t) => t.status === "TODO")} onEdit={triggeredEditModal} onDelete={handleDeleteTask} />
                  <DroppableKanbanColumn status="IN_PROGRESS" title="In Progress" tasks={tasks.filter((t) => t.status === "IN_PROGRESS")} onEdit={triggeredEditModal} onDelete={handleDeleteTask} />
                  <DroppableKanbanColumn status="IN_REVIEW" title="In Review" tasks={tasks.filter((t) => t.status === "IN_REVIEW")} onEdit={triggeredEditModal} onDelete={handleDeleteTask} />
                  <DroppableKanbanColumn status="DONE" title="Done" tasks={tasks.filter((t) => t.status === "DONE")} onEdit={triggeredEditModal} onDelete={handleDeleteTask} />
                </div>
              </DndContext>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-sm mx-auto text-center">
            <Trello className="w-12 h-12 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800 mt-4">Select Workspace Space</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Build or select a project workflow catalog from the left menu rail.</p>
            <button onClick={() => setIsProjModalOpen(true)} className="mt-4 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">
              Construct New Project
            </button>
          </div>
        )}
      </main>

      {/* --- TASK MODALS & PROJECT DIALOGS --- */}

      {isProjModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setIsProjModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">Create Project Space</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Name</label>
                <input type="text" required value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="e.g. Sprint Release" className="w-full text-sm border p-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <textarea value={projDesc} onChange={(e) => setProjDesc(e.target.value)} placeholder="A notes descriptor..." className="w-full text-sm border p-2.5 rounded-xl outline-none resize-none" rows={3} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Color TAG</label>
                <div className="flex gap-2">
                  {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((col) => (
                    <button type="button" key={col} onClick={() => setProjColor(col)} className={`w-7 h-7 rounded-lg transition ${projColor === col ? "scale-110 ring-2 ring-slate-800" : ""}`} style={{ backgroundColor: col }} />
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl">Create Workspace</button>
            </form>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">Add Pipeline Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Title</label>
                <input type="text" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Title text" className="w-full text-sm border p-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Details..." className="w-full text-sm border p-2.5 rounded-xl outline-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Due Date</label>
                  <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="w-full text-sm border p-2.5 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Assignee</label>
                  <input type="text" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="Name" className="w-full text-sm border p-2.5 rounded-xl outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                    <button type="button" key={p} onClick={() => setTaskPriority(p as TaskPriority)} className={`py-1.5 border text-xs font-semibold rounded-lg ${taskPriority === p ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl">Save Card</button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">Modify Task Parameter</h3>
            <form onSubmit={handleSaveEditTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Title</label>
                <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-sm border p-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full text-sm border p-2.5 rounded-xl outline-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Due Date</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full text-sm border p-2.5 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Assignee</label>
                  <input type="text" value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)} className="w-full text-sm border p-2.5 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as TaskStatus)} className="w-full text-sm border p-2 rounded-xl">
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Priority</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TaskPriority)} className="w-full text-sm border p-2 rounded-xl">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl">Save Changes</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
