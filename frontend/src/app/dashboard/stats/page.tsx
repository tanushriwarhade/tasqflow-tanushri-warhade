"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import {
  Trello,
  Folder,
  BarChart,
  Activity,
  ArrowLeft,
  RefreshCw,
  Database,
  Layers,
  AlertTriangle,
  Clock
} from "lucide-react";
import {
  BarChart as RechartBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartPieChart,
  Pie,
  Cell
} from "recharts";
import { ProjectStats, Project } from "@/src/types";

export default function WorkspaceStatsPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") || "";

  const [token, setToken] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheHeader, setCacheHeader] = useState<string | null>(null);

  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  useEffect(() => {
    const savedToken = localStorage.getItem("tasqflow_token");
    if (!savedToken) {
      window.location.href = "/";
    } else {
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token && projectId) {
      loadStats();
    }
  }, [token, projectId]);

  const loadStats = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Fetch Project details
      const projRes = await axios.get(`${getApiUrl()}/projects`, { headers });
      const current = projRes.data.find((p: Project) => p.id === projectId);
      setProject(current || null);

      // 2. Fetch computed statistics
      const statsRes = await axios.get(`${getApiUrl()}/projects/${projectId}/stats`, { headers });
      setCacheHeader(statsRes.headers["x-cache"] || "MISS");
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_COLORS = ["#94a3b8", "#3b82f6", "#fbbf24", "#10b981"];
  const PRIORITY_COLORS = ["#ccd3e0", "#38bdf8", "#f59e0b", "#f43f5e"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] gap-2 text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin" /> Load workspace parameters...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.href = "/dashboard"} className="p-2 hover:bg-slate-100 rounded-lg text-slate-505 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Project Workspace Overview</span>
            <h2 className="text-xl font-bold font-dislay text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project?.colorTag }}></span>
              {project?.name || "Pipeline Analytics"}
            </h2>
          </div>
        </div>

        <button onClick={loadStats} className="p-2.5 hover:bg-slate-50 text-slate-500 rounded-xl border border-slate-200 transition flex items-center gap-1.5 text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Recompute Stats
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 space-y-8 overflow-y-auto">
        
        {/* Core numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 border rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-slate-450 font-bold block tracking-wider">Cumulative Cards</span>
              <span className="text-3xl font-bold font-display text-slate-900 mt-1 block">{stats?.totalTasks || 0}</span>
            </div>
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <Layers className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 border rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-slate-450 font-bold block tracking-wider">Overdue Alerts</span>
              <span className={`text-3xl font-bold font-display mt-1 block ${stats?.overdueTasks && stats.overdueTasks > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {stats?.overdueTasks || 0}
              </span>
            </div>
            <div className={`p-4 rounded-2xl ${stats?.overdueTasks && stats.overdueTasks > 0 ? "bg-rose-50 text-rose-500 animate-pulse" : "bg-slate-50 text-slate-405"}`}>
              <Clock className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 border rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-slate-450 font-bold block tracking-wider">Redis Cache Code</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${
                  cacheHeader === "HIT" ? "bg-emerald-50 text-emerald-800 border-emerald-205" : "bg-amber-50 text-amber-800 border-amber-205"
                }`}>
                  {cacheHeader || "MISS"}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">60s TTL active</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 text-slate-500 rounded-2xl">
              <Database className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Recharts Graphical Columns */}
        {stats?.totalTasks && stats.totalTasks > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Status distribution PieChart */}
            <div className="bg-white p-6 border rounded-2xl shadow-xs flex flex-col">
              <h3 className="font-bold text-slate-850 font-display mb-6">Status Pipeline share</h3>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartPieChart>
                    <Pie
                      data={stats.byStatus}
                      cx="55%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </RechartPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Allocations bar */}
            <div className="bg-white p-6 border rounded-2xl shadow-xs flex flex-col">
              <h3 className="font-bold text-slate-850 font-display mb-6">Priority Level Allocation</h3>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartBarChart data={stats.byPriority}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <RechartTooltip />
                    <Legend />
                    <Bar dataKey="value" name="Task Count">
                      {stats.byPriority.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </RechartBarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white py-16 border rounded-2xl shadow-xs text-center max-w-sm mx-auto p-6">
            <BarChart className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 mt-3 font-display">No telemetry data</h4>
            <p className="text-xs text-slate-500 mt-1">Catalog at least one task to populate interactive Recharts graphics.</p>
          </div>
        )}

      </main>
    </div>
  );
}
