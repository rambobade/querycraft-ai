"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Play, Copy, Check, Download, RotateCcw } from "lucide-react";
import styles from "./SqlEditor.module.css";
import { Button, Spinner, Kbd } from "@/components/ui";

export interface SqlEditorProps {
  value: string;
  onChange: (val: string) => void;
  onExecute: () => void;
  isExecuting?: boolean;
}

export function SqlEditor({ value, onChange, onExecute, isExecuting }: SqlEditorProps) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      if (themeAttr === "light") {
        setIsDark(false);
      } else if (themeAttr === "dark") {
        setIsDark(true);
      } else {
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

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
    a.download = `query_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.title}>SQL</span>

        <div className={styles.actions}>
          <Button
            variant="quiet"
            size="sm"
            onClick={handleCopy}
            disabled={!value}
            aria-label={copied ? "Copied" : "Copy SQL"}
          >
            {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
          </Button>

          <Button
            variant="quiet"
            size="sm"
            onClick={handleDownload}
            disabled={!value}
            aria-label="Download SQL"
          >
            <Download size={14} strokeWidth={1.5} />
          </Button>

          <Button
            variant="quiet"
            size="sm"
            onClick={handleClear}
            disabled={!value}
            aria-label="Clear SQL editor"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onExecute}
            disabled={isExecuting || !value.trim()}
          >
            {isExecuting ? <Spinner label="Running query..." /> : <Play size={14} strokeWidth={1.5} />}
            <span>Run</span>
            <Kbd>Ctrl+↵</Kbd>
          </Button>
        </div>
      </div>

      <div className={styles.editorArea}>
        <Editor
          height="100%"
          defaultLanguage="sql"
          language="sql"
          theme={isDark ? "vs-dark" : "light"}
          value={value}
          onChange={(v) => onChange(v || "")}
          onMount={(editor, monaco) => {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
              onExecute();
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "var(--font-mono), monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: "all",
            overviewRulerBorder: false,
            folding: false,
          }}
        />
      </div>

      <div className={styles.footer}>
        <span>Read-only. SELECT statements only. Results limited to 1,000 rows.</span>
        <span>
          {value ? `${value.split("\n").length} lines` : "Empty"}
        </span>
      </div>
    </div>
  );
}
