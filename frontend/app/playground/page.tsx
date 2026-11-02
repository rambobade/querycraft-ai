"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { SqlEditor } from "@/components/SqlEditor";
import { ResultsTable } from "@/components/ResultsTable";
import { ChartView } from "@/components/ChartView";
import { SchemaTree } from "@/components/SchemaTree";
import { AiAssistant } from "@/components/AiAssistant";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  AISqlResponse,
  AIExplanation,
  AIOptimization,
  QueryExecutionResult,
} from "@/lib/types";
import {
  Sparkles,
  Play,
  Bookmark,
  Table as TableIcon,
  BarChart3,
  Code2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const { activeConnection } = useAuth();

  // State
  const [nlInput, setNlInput] = useState("");
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM products LIMIT 10;");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [aiResponse, setAiResponse] = useState<AISqlResponse | null>(null);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [optimization, setOptimization] = useState<AIOptimization | null>(null);
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(null);

  const [resultsTab, setResultsTab] = useState<"table" | "chart" | "json">("table");

  // Save Query Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Read URL query params on load (e.g. from Dashboard click)
  useEffect(() => {
    const p = searchParams.get("prompt");
    const s = searchParams.get("sql");
    if (p) setNlInput(p);
    if (s) setSqlQuery(s);
    if (p && !s && activeConnection) {
      handleGenerate(p);
    }
  }, [searchParams, activeConnection]);

  // Generate SQL from Natural Language
  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || nlInput;
    if (!promptToUse.trim() || !activeConnection) return;

    setIsGenerating(true);
    try {
      const res = await api.generateSQL({
        connection_id: activeConnection.id,
        natural_language_input: promptToUse.trim(),
      });
      setAiResponse(res);
      setSqlQuery(res.sanitized_sql || res.sql);

      // Auto-fetch query explanation
      try {
        const exp = await api.explainSQL(activeConnection.id, res.sanitized_sql || res.sql);
        setExplanation(exp);
      } catch (e) {
        // ignore
      }
    } catch (e: any) {
      alert(`AI generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute SQL Query
  const handleExecute = async () => {
    if (!sqlQuery.trim() || !activeConnection) return;

    setIsExecuting(true);
    try {
      const res = await api.executeSQL({
        connection_id: activeConnection.id,
        sql: sqlQuery.trim(),
        natural_language_input: nlInput.trim() || undefined,
      });
      setQueryResult(res);

      // Auto-fetch explanation if none present
      if (!explanation) {
        try {
          const exp = await api.explainSQL(activeConnection.id, sqlQuery.trim());
          setExplanation(exp);
        } catch (e) {
          // ignore
        }
      }
    } catch (e: any) {
      setQueryResult({
        success: false,
        columns: [],
        rows: [],
        row_count: 0,
        duration_ms: 0,
        sanitized_sql: sqlQuery,
        warnings: [],
        error: e.message || "Execution error",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Run Query Optimization (EXPLAIN)
  const handleOptimize = async () => {
    if (!sqlQuery.trim() || !activeConnection) return;
    setIsOptimizing(true);
    try {
      const opt = await api.optimizeSQL(activeConnection.id, sqlQuery.trim());
      setOptimization(opt);
    } catch (e: any) {
      alert(`Optimization analysis failed: ${e.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Save Query Handler
  const handleSaveQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitle.trim() || !activeConnection) return;
    setIsSaving(true);
    try {
      await api.createSavedQuery({
        connection_id: activeConnection.id,
        title: saveTitle.trim(),
        description: saveDesc.trim() || undefined,
        tags: saveTags.trim() || undefined,
        natural_language_input: nlInput.trim() || undefined,
        sql_query: sqlQuery.trim(),
      });
      setIsSaveModalOpen(false);
      setSaveTitle("");
      setSaveTags("");
      setSaveDesc("");
      alert("Query bookmarked successfully!");
    } catch (e: any) {
      alert(`Failed to save query: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const examplePrompts = [
    "Top 10 spending customers",
    "Monthly revenue trend",
    "Department average salaries",
    "Customers with zero orders",
    "Top 5 products by revenue",
    "Duplicate customer emails",
  ];

  return (
    <div className="flex h-screen bg-[#090d16] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar title="SQL Playground" />

        {/* Workspace Grid */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Top Row: NL Input & Quick Actions */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-shrink-0">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Describe the query you want in natural language (e.g. Find top 10 customers who spent the most)..."
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="w-full pl-4 pr-10 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !nlInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-semibold text-xs transition-colors flex-shrink-0 shadow-sm"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? "Generating..." : "Generate SQL"}</span>
              </button>
            </div>

            {/* Prompt Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              <span className="text-[11px] text-slate-500 flex-shrink-0">Examples:</span>
              {examplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setNlInput(p);
                    handleGenerate(p);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-[11px] flex-shrink-0 transition-colors border border-slate-700/50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Main Workspace Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
            {/* Center Area: Monaco Editor + Results Panel (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
              {/* Top: Monaco Editor (takes 45% height) */}
              <div className="h-[45%] flex-shrink-0">
                <SqlEditor
                  value={sqlQuery}
                  onChange={setSqlQuery}
                  onExecute={handleExecute}
                  isExecuting={isExecuting}
                />
              </div>

              {/* Bottom: Query Results Tabs (takes 55% height) */}
              <div className="flex-1 flex flex-col bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden min-h-0 shadow-sm">
                {/* Result Tabs Header */}
                <div className="h-10 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs flex-shrink-0">
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setResultsTab("table")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                        resultsTab === "table" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      onClick={() => setResultsTab("chart")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                        resultsTab === "chart" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Charts</span>
                    </button>
                    <button
                      onClick={() => setResultsTab("json")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                        resultsTab === "json" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>JSON</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSaveTitle(nlInput || "Custom Query");
                        setIsSaveModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                      <span>Bookmark Query</span>
                    </button>
                  </div>
                </div>

                {/* Result Views Container */}
                <div className="flex-1 overflow-hidden min-h-0">
                  {resultsTab === "table" ? (
                    <ResultsTable
                      columns={queryResult?.columns || []}
                      rows={queryResult?.rows || []}
                      durationMs={queryResult?.duration_ms || 0}
                      warnings={queryResult?.warnings || []}
                      error={queryResult?.error}
                    />
                  ) : resultsTab === "chart" ? (
                    <ChartView
                      columns={queryResult?.columns || []}
                      rows={queryResult?.rows || []}
                    />
                  ) : (
                    <div className="p-4 h-full overflow-auto bg-slate-950 font-mono text-xs text-slate-300">
                      <pre>{JSON.stringify(queryResult?.rows || [], null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Schema Explorer & AI Assistant (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
              {/* Top half: Schema Explorer Tree (45% height) */}
              <div className="h-[45%] flex-shrink-0">
                <SchemaTree
                  connectionId={activeConnection?.id}
                  onInsertSnippet={(snippet) => setSqlQuery(snippet)}
                />
              </div>

              {/* Bottom half: AI Assistant (Explanation & Optimizer) (55% height) */}
              <div className="flex-1 min-h-0">
                <AiAssistant
                  aiResponse={aiResponse}
                  explanation={explanation}
                  optimization={optimization}
                  isOptimizing={isOptimizing}
                  onTriggerOptimization={handleOptimize}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Query Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-amber-400" />
              <span>Bookmark Query</span>
            </h3>

            <form onSubmit={handleSaveQuery} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Revenue by Category"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. sales, revenue, quarterly"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  placeholder="Optional notes or intended audience..."
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg"
                >
                  {isSaving ? "Saving..." : "Save Query"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs">
          <RefreshCw className="h-5 w-5 animate-spin mr-2 text-indigo-400" />
          <span>Loading SQL Playground...</span>
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
