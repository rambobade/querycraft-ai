"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { QueryHistoryItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  History,
  Terminal,
  Search,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { activeConnection } = useAuth();
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getQueryHistory();
      setHistory(data);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteQueryHistory(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete your entire query history?")) return;
    try {
      await api.clearAllHistory();
      setHistory([]);
    } catch (e: any) {
      alert(`Clear failed: ${e.message}`);
    }
  };

  const handleCopy = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHistory = history.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.generated_sql.toLowerCase().includes(term) ||
      (item.natural_language_input && item.natural_language_input.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Query History" />

        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Execution History</h2>
              <p className="text-slate-400 mt-0.5">
                Audit trail of natural language questions, generated SQL, durations, and statuses.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {history.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/60 text-rose-300 rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500">Loading query history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              <History className="h-10 w-10 mx-auto text-slate-700 mb-2" />
              <p>No queries found in history.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-sm"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          item.execution_status === "success"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {item.execution_status === "success" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span>{item.execution_status}</span>
                      </span>

                      {item.natural_language_input && (
                        <span className="font-semibold text-slate-200 text-xs">
                          &quot;{item.natural_language_input}&quot;
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{item.execution_duration_ms} ms</span>
                      </span>
                      <span>&bull;</span>
                      <span>{item.row_count} rows</span>
                      <span>&bull;</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>

                  {/* SQL Preview */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-slate-300 overflow-x-auto text-xs whitespace-pre-wrap">
                    {item.executed_sql}
                  </div>

                  {item.error_message && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded text-rose-300 font-mono text-[11px]">
                      {item.error_message}
                    </div>
                  )}

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleCopy(item.executed_sql, item.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/playground?sql=${encodeURIComponent(item.executed_sql)}&prompt=${encodeURIComponent(
                            item.natural_language_input || ""
                          )}`
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-medium transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Rerun in Playground</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
