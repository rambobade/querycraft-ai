"use client";

import React, { useState } from "react";
import { Database, X, Check, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function ConnectionModal({ isOpen, onClose, onCreated }: ConnectionModalProps) {
  const [databaseType, setDatabaseType] = useState<"sqlite" | "postgresql" | "mysql">("sqlite");
  const [name, setName] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [filePath, setFilePath] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testRawConnection({
        database_type: databaseType,
        database_name: databaseType === "sqlite" ? filePath : databaseName,
        host,
        port: port || (databaseType === "postgresql" ? "5432" : "3306"),
        username,
        password,
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Failed to reach database." });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Please enter a connection name.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api.createConnection({
        name,
        database_type: databaseType,
        database_name: databaseType === "sqlite" ? filePath : databaseName,
        host,
        port: port || (databaseType === "postgresql" ? "5432" : databaseType === "mysql" ? "3306" : undefined),
        username,
        password,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setFormError(e.message || "Failed to save connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Connect New Database</h2>
              <p className="text-[11px] text-slate-400">Add a PostgreSQL, MySQL, or SQLite instance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Database Dialect Selector */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Database Dialect</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "sqlite", label: "SQLite" },
                { id: "postgresql", label: "PostgreSQL" },
                { id: "mysql", label: "MySQL" },
              ].map((db) => (
                <button
                  type="button"
                  key={db.id}
                  onClick={() => {
                    setDatabaseType(db.id as any);
                    setTestResult(null);
                  }}
                  className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                    databaseType === db.id
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {db.label}
                </button>
              ))}
            </div>
          </div>

          {/* Connection Name */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Connection Name</label>
            <input
              type="text"
              placeholder="e.g. Production Analytics Read-Replica"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {databaseType === "sqlite" ? (
            <div>
              <label className="block text-slate-400 font-medium mb-1">SQLite Database Path</label>
              <input
                type="text"
                placeholder="e.g. ./database/sample_ecommerce.db or :memory:"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Tip: Enter <code className="text-indigo-400 font-mono">sample_ecommerce.db</code> to load the built-in store sample.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-medium mb-1">Host</label>
                  <input
                    type="text"
                    placeholder="localhost or db.provider.com"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Port</label>
                  <input
                    type="text"
                    placeholder={databaseType === "postgresql" ? "5432" : "3306"}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Database Name</label>
                <input
                  type="text"
                  placeholder="e.g. main_warehouse"
                  value={databaseName}
                  onChange={(e) => setDatabaseName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="readonly_user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                testResult.success
                  ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                  : "bg-rose-950/40 border-rose-800/80 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
              <span>{testing ? "Testing..." : "Test Connection"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-semibold shadow-sm transition-colors"
              >
                {submitting ? "Saving..." : "Save Connection"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
