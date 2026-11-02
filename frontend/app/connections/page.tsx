"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { ConnectionModal } from "@/components/ConnectionModal";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Database, Plus, CheckCircle2, Trash2, RefreshCw, Server, AlertCircle } from "lucide-react";

export default function ConnectionsPage() {
  const { connections, activeConnection, setActiveConnection, refreshConnections } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.testConnection(id);
      setTestResults((prev) => ({ ...prev, [id]: res }));
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: e.message || "Connection failed" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete connection "${name}"?`)) return;
    try {
      await api.deleteConnection(id);
      await refreshConnections();
      if (activeConnection?.id === id) {
        setActiveConnection(null);
      }
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Database Connections" />

        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Connected Databases</h2>
              <p className="text-slate-400 mt-0.5">
                Manage PostgreSQL, MySQL, and SQLite instances. Credentials are encrypted at rest with Fernet.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Connection</span>
            </button>
          </div>

          {/* Connections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                <Database className="h-10 w-10 mx-auto text-slate-700 mb-2" />
                <p>No database connections found.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500"
                >
                  Create First Connection
                </button>
              </div>
            ) : (
              connections.map((conn) => {
                const isActive = activeConnection?.id === conn.id;
                const testRes = testResults[conn.id];

                return (
                  <div
                    key={conn.id}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? "bg-slate-900 border-indigo-500/80 shadow-md shadow-indigo-950/40"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                            <Server className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-100 text-sm">{conn.name}</h3>
                            <span className="uppercase text-[10px] font-mono text-indigo-400 font-semibold">
                              {conn.database_type} {conn.is_sample && "• Built-in Sample"}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveConnection(conn)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                          >
                            Set Active
                          </button>
                        )}
                      </div>

                      {/* Connection Details */}
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5 font-mono text-[11px] text-slate-400">
                        <div className="flex justify-between">
                          <span>Target:</span>
                          <span className="text-slate-200 truncate max-w-xs">{conn.database_name || "sample_ecommerce.db"}</span>
                        </div>
                        {conn.host && (
                          <div className="flex justify-between">
                            <span>Host / Port:</span>
                            <span className="text-slate-200">{conn.host}:{conn.port || "default"}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Credentials:</span>
                          <span className="text-emerald-400">Fernet Encrypted (AES-CBC)</span>
                        </div>
                      </div>

                      {/* Live Test Result */}
                      {testRes && (
                        <div
                          className={`mt-2 p-2 rounded text-[11px] flex items-center gap-1.5 ${
                            testRes.success
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                              : "bg-rose-950/40 text-rose-300 border border-rose-800/60"
                          }`}
                        >
                          {testRes.success ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                          )}
                          <span>{testRes.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleTest(conn.id)}
                        disabled={testingId === conn.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded font-medium transition-colors text-xs"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${testingId === conn.id ? "animate-spin" : ""}`} />
                        <span>{testingId === conn.id ? "Testing..." : "Test Health"}</span>
                      </button>

                      {!conn.is_sample && (
                        <button
                          onClick={() => handleDelete(conn.id, conn.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                          title="Delete Connection"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => refreshConnections()}
      />
    </div>
  );
}
