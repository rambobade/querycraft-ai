"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DatabaseSchema, TableSchema } from "@/lib/types";
import {
  FileCode2,
  Table,
  Columns,
  Key,
  Link as LinkIcon,
  Search,
  RefreshCw,
  Terminal,
  Shield,
  Layers,
} from "lucide-react";

export default function SchemaPage() {
  const router = useRouter();
  const { activeConnection } = useAuth();
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSchema = async () => {
    if (!activeConnection) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSchema(activeConnection.id);
      setSchema(data);
    } catch (e: any) {
      setError(e.message || "Failed to inspect database schema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
  }, [activeConnection]);

  const filteredTables = (schema?.tables || []).filter((tbl) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const tableMatch = tbl.name.toLowerCase().includes(term);
    const colMatch = tbl.columns.some((c) => c.name.toLowerCase().includes(term));
    return tableMatch || colMatch;
  });

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Database Schema Explorer" />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">Schema Explorer</h2>
                {schema && (
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-mono text-[11px]">
                    {schema.table_count} Tables Introspected
                  </span>
                )}
              </div>
              <p className="text-slate-400 mt-0.5">
                Target: <strong className="text-slate-200">{activeConnection?.name || "None"}</strong> &bull; Dialect:{" "}
                <span className="uppercase font-mono text-indigo-400">{activeConnection?.database_type}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter tables or columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={loadSchema}
                disabled={loading || !activeConnection}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg font-medium transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-400 mb-3" />
              <p className="font-medium text-slate-300">Introspecting database catalog...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-rose-300">
              {error}
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              <FileCode2 className="h-10 w-10 mx-auto text-slate-700 mb-2" />
              <p>No tables matching &quot;{searchTerm}&quot; found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTables.map((tbl) => (
                <div
                  key={tbl.name}
                  className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Table Title Card */}
                    <div className="p-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-indigo-400" />
                        <h3 className="font-semibold text-slate-100 text-sm">{tbl.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {tbl.row_count} rows &bull; {tbl.columns.length} cols
                        </span>
                        <button
                          onClick={() =>
                            router.push(`/playground?sql=${encodeURIComponent(`SELECT * FROM ${tbl.name} LIMIT 25;`)}`)
                          }
                          title="Query Table in Playground"
                          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded text-[11px] font-medium transition-colors"
                        >
                          <Terminal className="h-3 w-3" />
                          <span>Query</span>
                        </button>
                      </div>
                    </div>

                    {/* Columns List */}
                    <div className="p-3 divide-y divide-slate-800/50">
                      {tbl.columns.map((col) => (
                        <div key={col.name} className="py-2 flex items-center justify-between font-mono text-[11px]">
                          <div className="flex items-center gap-2 truncate pr-2">
                            {col.primary_key ? (
                              <span title="Primary Key">
                                <Key className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                              </span>
                            ) : (
                              <Columns className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                            )}
                            <span className={col.primary_key ? "text-amber-300 font-bold" : "text-slate-200"}>
                              {col.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] flex-shrink-0">
                            {col.primary_key && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                                PRIMARY KEY
                              </span>
                            )}
                            <span className="text-slate-500">{col.type}</span>
                            <span className="text-slate-600">[{col.nullable ? "NULL" : "NOT NULL"}]</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Foreign Keys & Indexes Footer */}
                    {tbl.foreign_keys && tbl.foreign_keys.length > 0 && (
                      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                          Foreign Key Relationships
                        </span>
                        {tbl.foreign_keys.map((fk, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-[11px] text-indigo-400 font-mono">
                            <LinkIcon className="h-3 w-3 flex-shrink-0" />
                            <span>
                              ({fk.constrained_columns.join(", ")}) &rarr; {fk.referred_table}(
                              {fk.referred_columns.join(", ")})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
