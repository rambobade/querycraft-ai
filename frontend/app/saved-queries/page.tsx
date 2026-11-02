"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";
import { SavedQuery } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { BookmarkCheck, Terminal, Search, Trash2, Tag, Copy, Check, Plus } from "lucide-react";

export default function SavedQueriesPage() {
  const router = useRouter();
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadQueries = async () => {
    setLoading(true);
    try {
      const data = await api.getSavedQueries();
      setSavedQueries(data);
    } catch (e) {
      console.error("Failed to load saved queries", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this saved query?")) return;
    try {
      await api.deleteSavedQuery(id);
      setSavedQueries((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const handleCopy = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = savedQueries.filter((q) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      q.title.toLowerCase().includes(term) ||
      (q.tags && q.tags.toLowerCase().includes(term)) ||
      q.sql_query.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Saved Queries" />

        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Saved Queries</h2>
              <p className="text-slate-400 mt-0.5">
                Bookmarked business reports, standard queries, and reusable SQL snippets.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter saved queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => router.push("/playground")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New in Playground</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500">Loading saved queries...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              <BookmarkCheck className="h-10 w-10 mx-auto text-slate-700 mb-2" />
              <p>No saved queries found.</p>
              <button
                onClick={() => router.push("/playground")}
                className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500"
              >
                Bookmark from Playground
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-100 text-sm">{item.title}</h3>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete Query"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {item.tags && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.tags.split(",").map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 font-mono text-[10px] flex items-center gap-1"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            <span>{tag.trim()}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {item.natural_language_input && (
                      <div className="text-[11px] text-slate-400 italic mb-2">
                        &quot;{item.natural_language_input}&quot;
                      </div>
                    )}

                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-slate-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-36">
                      {item.sql_query}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Saved {formatDate(item.created_at)}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(item.sql_query, item.id)}
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
                            `/playground?sql=${encodeURIComponent(item.sql_query)}&prompt=${encodeURIComponent(
                              item.natural_language_input || ""
                            )}`
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                      >
                        <Terminal className="h-3 w-3" />
                        <span>Open in Playground</span>
                      </button>
                    </div>
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
