"use client";

import React, { useState } from "react";
import { AIExplanation, AIOptimization, AISqlResponse } from "@/lib/types";
import { Sparkles, Gauge, ShieldCheck, CheckCircle2, AlertTriangle, Cpu, Terminal, ArrowRight } from "lucide-react";

interface AiAssistantProps {
  aiResponse?: AISqlResponse | null;
  explanation?: AIExplanation | null;
  optimization?: AIOptimization | null;
  isOptimizing?: boolean;
  onTriggerOptimization?: () => void;
}

export function AiAssistant({
  aiResponse,
  explanation,
  optimization,
  isOptimizing,
  onTriggerOptimization,
}: AiAssistantProps) {
  const [activeTab, setActiveTab] = useState<"explanation" | "optimizer" | "metadata">("explanation");

  return (
    <div className="flex flex-col h-full bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-sm text-xs">
      {/* Header Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/90 px-2">
        <button
          onClick={() => setActiveTab("explanation")}
          className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === "explanation"
              ? "border-indigo-500 text-indigo-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Explanation</span>
        </button>

        <button
          onClick={() => setActiveTab("optimizer")}
          className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === "optimizer"
              ? "border-indigo-500 text-indigo-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Gauge className="h-3.5 w-3.5" />
          <span>Optimizer</span>
          {optimization && (
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
                optimization.cost_indicator === "Low"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : optimization.cost_indicator === "Medium"
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              {optimization.cost_indicator} Cost
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("metadata")}
          className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors ${
            activeTab === "metadata"
              ? "border-indigo-500 text-indigo-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Security & Context</span>
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: AI Query Explanation */}
        {activeTab === "explanation" && (
          <div className="space-y-4">
            {explanation ? (
              <>
                {/* Summary Box */}
                <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-slate-200 space-y-1.5">
                  <span className="font-semibold text-indigo-300 text-[11px] uppercase tracking-wider block">
                    Query Summary
                  </span>
                  <p className="text-slate-300 leading-relaxed">{explanation.summary}</p>
                </div>

                {/* Operations Badges */}
                {explanation.operations && explanation.operations.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">Operations Executed</span>
                    <div className="flex flex-wrap gap-1.5">
                      {explanation.operations.map((op) => (
                        <span
                          key={op}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700"
                        >
                          {op}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution Steps */}
                {explanation.steps && explanation.steps.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">Step-by-Step Logic</span>
                    <ol className="space-y-2">
                      {explanation.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <span className="h-4 w-4 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Performance Notes */}
                {explanation.performance_notes && (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-300 block mb-1">Performance Insight</span>
                    <p>{explanation.performance_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Sparkles className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p>Generate or execute a query to view AI explanation.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Query Optimizer */}
        {activeTab === "optimizer" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Performance & EXPLAIN Analysis</span>
              {onTriggerOptimization && (
                <button
                  onClick={onTriggerOptimization}
                  disabled={isOptimizing}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-xs font-medium transition-colors"
                >
                  {isOptimizing ? "Analyzing..." : "Re-Analyze Plan"}
                </button>
              )}
            </div>

            {optimization ? (
              <>
                {/* Cost Indicator Card */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-indigo-400" />
                    <span className="text-slate-300 font-medium">Estimated Query Cost:</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                      optimization.cost_indicator === "Low"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : optimization.cost_indicator === "Medium"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {optimization.cost_indicator} Overhead
                  </span>
                </div>

                {/* Suggestions List */}
                {optimization.suggestions && optimization.suggestions.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">Recommendations</span>
                    <div className="space-y-2">
                      {optimization.suggestions.map((sug, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/90 text-slate-300 space-y-1"
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-300">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            <span>{sug.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{sug.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw EXPLAIN Plan */}
                {optimization.plan && optimization.plan.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">Execution Plan Nodes</span>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1 overflow-x-auto max-h-40">
                      {optimization.plan.map((p, idx) => (
                        <div key={idx} className="truncate">
                          &bull; {p.detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Gauge className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p>Run query optimization to inspect database execution plans.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Security & Metadata */}
        {activeTab === "metadata" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Deterministic AST Security</span>
              </div>
              <ul className="space-y-1 text-[11px] text-emerald-200/90">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Read-Only SELECT Enforcement</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Multi-statement injection blocked</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span>System catalog access prevented</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Row limit & execution timeout protected</span>
                </li>
              </ul>
            </div>

            {aiResponse && (
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2.5 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Generation Confidence:</span>
                  <span
                    className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] font-mono ${
                      aiResponse.confidence === "high"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {aiResponse.confidence}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Engine Source:</span>
                  <span className="font-mono text-slate-200 capitalize">{aiResponse.source}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Referenced Tables:</span>
                  <div className="flex flex-wrap gap-1">
                    {aiResponse.tables_used.map((tbl) => (
                      <span key={tbl} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px]">
                        {tbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
