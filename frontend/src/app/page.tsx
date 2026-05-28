"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trello, AlertTriangle, RefreshCw } from "lucide-react";

export default function AuthPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if token exists, then skip to dashboard
    const token = localStorage.getItem("tasqflow_token");
    if (token) {
      window.location.href = "/dashboard";
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const endpoint = isRegisterMode ? `${apiUrl}/auth/register` : `${apiUrl}/auth/login`;
    const payload = isRegisterMode ? { name, email, password } : { email, password };

    try {
      const response = await axios.post(endpoint, payload);
      const { token, user } = response.data;

      // Persist auth status
      localStorage.setItem("tasqflow_token", token);
      localStorage.setItem("tasqflow_user", JSON.stringify(user));

      // Redirect cleanly
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.error || err.response?.data?.errors 
        ? JSON.stringify(err.response.data.errors) 
        : "Failed to authenticate. Identify server logs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/20">
            <Trello className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-bold font-display tracking-tight text-white">
            tasqflow
          </span>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white font-display">
            {isRegisterMode ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-slate-400 text-sm mt-1.5">
            {isRegisterMode ? "Start organizing your development pipeline" : "Sign in to access your task boards"}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-450" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full text-sm bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 px-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full text-sm bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 px-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 px-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validating workspace credentials...
              </span>
            ) : isRegisterMode ? (
              "Register Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/85 pt-6">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError("");
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            {isRegisterMode ? "Already registered? Sign in instead" : "Create new pipeline workspace? Join tasqflow"}
          </button>
        </div>
      </div>
    </div>
  );
}
