"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Copy, Check, Download, Trash2, Wand2, Shield } from "lucide-react";

interface SqlEditorProps {
  value: string;
  onChange: (val: string) => void;
  onExecute: () => void;
  isExecuting?: boolean;
}

export function SqlEditor({ value, onChange, onExecute, isExecuting }: SqlEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!value) return;
    const blob = new Blob([value], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `querycraft_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFormat = () => {
    if (!value) return;
    // Simple client-side standard keyword indentation format
    const keywords = [
      "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY",
      "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "JOIN", "LIMIT", "UNION", "WITH"
    ];
    let formatted = value;
    keywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      formatted = formatted.replace(regex, `\n${kw.toUpperCase()}`);
    });
    onChange(formatted.trim());
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Editor Toolbar */}
      <div className="h-11 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">SQL Query Editor</span>
          <span className="text-[10px] text-slate-500 font-mono">Monaco • SQLGlot AST Guard</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFormat}
            disabled={!value}
            title="Format SQL"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleCopy}
            disabled={!value}
            title="Copy SQL"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            disabled={!value}
            title="Download .sql"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleClear}
            disabled={!value}
            title="Clear Editor"
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Run Query Button */}
          <button
            onClick={onExecute}
            disabled={isExecuting || !value.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold shadow-sm shadow-emerald-900/30 transition-all text-xs"
          >
            <Play className={`h-3.5 w-3.5 ${isExecuting ? "animate-spin" : "fill-current"}`} />
            <span>{isExecuting ? "Executing..." : "Run Query"}</span>
            <span className="hidden sm:inline text-[10px] opacity-75 font-mono ml-1">Ctrl+↵</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 min-h-[220px]">
        <Editor
          height="100%"
          defaultLanguage="sql"
          language="sql"
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v || "")}
          onMount={(editor, monaco) => {
            // Bind Ctrl+Enter shortcut for execution
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
              onExecute();
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "var(--font-jetbrains), Consolas, Monaco, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "all",
            overviewRulerBorder: false,
            folding: true,
          }}
        />
      </div>

      {/* Editor Footer / Security Indicator */}
      <div className="h-7 px-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Shield className="h-3 w-3" />
          <span>AST Sanitizer: Prohibits DDL/DML Mutations</span>
        </div>
        <div>
          <span>{value.split("\n").length} lines • {value.length} chars</span>
        </div>
      </div>
    </div>
  );
}
