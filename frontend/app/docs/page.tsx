"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Terminal,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  Code2,
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Documentation & Guide" />

        <main className="flex-1 p-6 sm:p-8 max-w-5xl w-full mx-auto space-y-8 text-xs leading-relaxed text-slate-300">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">QueryCraft AI Documentation</h2>
            <p className="text-sm text-slate-400">
              Architecture guide, security validation protocols, and API references for QueryCraft AI.
            </p>
          </div>

          {/* Processing Pipeline Diagram */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <h3 className="font-semibold text-slate-100 text-sm">Processing Pipeline</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-[11px] font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-indigo-400 font-bold block">1. Natural Input</span>
                <span className="text-slate-400">User types question in plain English</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-indigo-400 font-bold block">2. Schema Context</span>
                <span className="text-slate-400">Introspects tables, columns & FKs</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-indigo-400 font-bold block">3. LLM / Heuristic</span>
                <span className="text-slate-400">Generates structured SQL JSON</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold block">4. AST Validator</span>
                <span className="text-slate-400">SQLGlot enforces read-only & limits</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-indigo-400 font-bold block">5. Safe Execution</span>
                <span className="text-slate-400">Renders table & Recharts visuals</span>
              </div>
            </div>
          </div>

          {/* Security Deep Dive */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold text-slate-100 text-sm">Deterministic Security Architecture</h3>
            </div>
            <p>
              Unlike simple LLM wrappers that blindly pass generated text into database connections, QueryCraft AI treats
              database security as an uncompromising primary guarantee:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>
                <strong className="text-slate-200">Abstract Syntax Tree (AST) Parsing:</strong> Queries are parsed using SQLGlot into structured syntax trees rather than using fragile regular expressions.
              </li>
              <li>
                <strong className="text-slate-200">Read-Only Enforced:</strong> Root statements are restricted to SELECT and CTE expressions. Any presence of <code className="text-rose-400 font-mono">INSERT</code>, <code className="text-rose-400 font-mono">UPDATE</code>, <code className="text-rose-400 font-mono">DELETE</code>, <code className="text-rose-400 font-mono">DROP</code>, <code className="text-rose-400 font-mono">ALTER</code>, <code className="text-rose-400 font-mono">TRUNCATE</code>, <code className="text-rose-400 font-mono">CREATE</code>, or <code className="text-rose-400 font-mono">GRANT</code> is blocked deterministically.
              </li>
              <li>
                <strong className="text-slate-200">Multi-statement Protection:</strong> Semicolon-chained injections are caught by AST statement counting and instantly rejected.
              </li>
              <li>
                <strong className="text-slate-200">System Catalog Protection:</strong> Block access to internal authentication tables like <code className="text-slate-300 font-mono">pg_shadow</code>, <code className="text-slate-300 font-mono">mysql.user</code>.
              </li>
              <li>
                <strong className="text-slate-200">Automatic LIMIT Clamping:</strong> If the user or model omits a LIMIT, a safe default (100) is injected. Any oversized LIMIT is capped to 1,000.
              </li>
            </ul>
          </div>

          {/* Supported SQL Dialects */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" />
              <h3 className="font-semibold text-slate-100 text-sm">Supported Database Dialects</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">SQLite</span>
                <p className="text-slate-400 text-[11px]">
                  Zero-config local files, in-memory databases, and built-in sample store.
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">PostgreSQL</span>
                <p className="text-slate-400 text-[11px]">
                  Enterprise relational schemas with schemas, foreign keys, and indexes.
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">MySQL</span>
                <p className="text-slate-400 text-[11px]">
                  Compatible with MySQL 8.x, MariaDB, and AWS RDS/Aurora instances.
                </p>
              </div>
            </div>
          </div>

          {/* REST API Endpoints Table */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-400" />
              <h3 className="font-semibold text-slate-100 text-sm">Key REST API Endpoints</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Endpoint</th>
                    <th className="py-2 px-3 font-sans">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2 px-3 text-indigo-400 font-bold">POST</td>
                    <td className="py-2 px-3">/api/ai/generate-sql</td>
                    <td className="py-2 px-3 font-sans text-slate-400">Generate schema-aware SQL from natural language</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-400 font-bold">POST</td>
                    <td className="py-2 px-3">/api/ai/explain-sql</td>
                    <td className="py-2 px-3 font-sans text-slate-400">Deconstruct SQL into step-by-step logic breakdown</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                    <td className="py-2 px-3">/api/query/execute</td>
                    <td className="py-2 px-3 font-sans text-slate-400">Validate and safely execute SQL against target database</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-blue-400 font-bold">GET</td>
                    <td className="py-2 px-3">/api/schema/&#123;id&#125;</td>
                    <td className="py-2 px-3 font-sans text-slate-400">Introspect tables, columns, keys, and row counts</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-amber-400 font-bold">POST</td>
                    <td className="py-2 px-3">/api/ai/optimize-sql</td>
                    <td className="py-2 px-3 font-sans text-slate-400">EXPLAIN execution plan and missing index suggestions</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
