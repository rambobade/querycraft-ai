"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { QueryHistoryItem } from "@/lib/types";
import {
  Sparkles,
  ArrowRight,
  Database,
  Terminal,
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, activeConnection, connections } = useAuth();
  const [quickPrompt, setQuickPrompt] = useState("");
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const hist = await api.getQueryHistory();
        setHistory(hist);
      } catch (e) {
        // user might be logged out or new
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    router.push(`/playground?prompt=${encodeURIComponent(quickPrompt.trim())}`);
  };

  const totalQueries = history.length;
  const successfulQueries = history.filter((h) => h.execution_status === "success").length;
  const successRate = totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 100;
  const avgLatency =
    totalQueries > 0
      ? (history.reduce((acc, h) => acc + h.execution_duration_ms, 0) / totalQueries).toFixed(1)
      : "1.8";

  const examplePrompts = [
    "Show the top 10 customers who spent the most money",
    "Calculate monthly sales and revenue trend",
    "Find customers who have not placed an order",
    "Show average salary department-wise",
    "Find the top 5 products by revenue",
  ];

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Mission Control" />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Deterministic SQL AST Generation & Safety Guard</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Natural Language to SQL Assistant
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Connect your database, ask complex business questions in plain English, inspect AST security checks,
                and analyze query metrics in real-time.
              </p>

              {/* Quick Input Bar */}
              <form onSubmit={handleQuickSubmit} className="pt-2 flex items-center gap-2 max-w-xl">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="e.g. Show top 5 products by revenue and units sold..."
                    value={quickPrompt}
                    onChange={(e) => setQuickPrompt(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/30 flex-shrink-0"
                >
                  <span>Build SQL</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Background decoration */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-600/10 to-transparent pointer-events-none" />
          </div>

          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Active Database</span>
                <Database className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 truncate">
                {activeConnection ? activeConnection.name : "None Selected"}
              </div>
              <p className="text-[11px] text-slate-500 capitalize">
                Dialect: {activeConnection ? activeConnection.database_type : "Disconnected"}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Total Queries</span>
                <Terminal className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">{totalQueries}</div>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Isolated per user account</span>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Success Rate</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400">{successRate}%</div>
              <p className="text-[11px] text-slate-500">
                {successfulQueries} executed without errors
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
                <Clock className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">{avgLatency} ms</div>
              <p className="text-[11px] text-slate-500">Query execution time</p>
            </div>
          </div>

          {/* Quick-Start Prompts & Connection Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Starters */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-semibold text-slate-200 text-sm">Suggested Natural Language Prompts</h3>
                </div>
                <span className="text-[11px] text-slate-500">Click to run in playground</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {examplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push(`/playground?prompt=${encodeURIComponent(p)}`)}
                    className="p-3 text-left rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-indigo-500/50 text-slate-300 hover:text-slate-100 transition-all text-xs flex items-center justify-between group"
                  >
                    <span className="truncate pr-2 font-medium">{p}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Current Active Connection Status Card */}
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200 text-sm">Target Database</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-semibold uppercase">
                  Connected
                </span>
              </div>

              {activeConnection ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <p className="font-semibold text-slate-200">{activeConnection.name}</p>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className="uppercase font-mono text-indigo-400 font-semibold">
                        {activeConnection.database_type}
                      </span>
                      <span>&bull;</span>
                      <span>{activeConnection.is_sample ? "Built-in Sample Database" : activeConnection.host || "Custom"}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-slate-400 text-[11px]">
                    <div className="flex justify-between">
                      <span>Security Mode:</span>
                      <span className="text-emerald-400 font-medium">Read-Only SELECT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Row Limit:</span>
                      <span className="text-slate-200 font-mono">1,000 rows</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Execution Timeout:</span>
                      <span className="text-slate-200 font-mono">15 seconds</span>
                    </div>
                  </div>

                  <Link
                    href="/schema"
                    className="block text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    View Schema Explorer &rarr;
                  </Link>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  <p>No database selected.</p>
                  <Link href="/connections" className="text-indigo-400 hover:underline mt-2 inline-block">
                    Manage Connections &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Query History Table */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-400" />
                <h3 className="font-semibold text-slate-200 text-sm">Recent Query Executions</h3>
              </div>
              <Link href="/history" className="text-xs text-indigo-400 hover:underline">
                View all history &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-800/60 text-xs font-mono">
              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  No queries executed yet. Jump to SQL Playground to run your first query!
                </div>
              ) : (
                history.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="min-w-0 pr-4">
                      <p className="text-slate-200 font-medium font-sans truncate">
                        {item.natural_language_input || item.generated_sql}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.executed_sql}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          item.execution_status === "success"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {item.execution_status}
                      </span>
                      <span className="text-slate-400 text-[11px]">{item.execution_duration_ms} ms</span>
                      <button
                        onClick={() =>
                          router.push(
                            `/playground?sql=${encodeURIComponent(item.executed_sql)}&prompt=${encodeURIComponent(
                              item.natural_language_input || ""
                            )}`
                          )
                        }
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
