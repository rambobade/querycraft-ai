"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Download, Save, MoreHorizontal, ChevronRight, ChevronDown, Check } from "lucide-react";
import styles from "./QueryPage.module.css";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { SqlEditor } from "@/components/SqlEditor";
import { ResultsTable } from "@/components/ResultsTable";
import { ChartView } from "@/components/ChartView";
import { TablesPanel } from "@/components/TablesPanel";
import {
  Button,
  Textarea,
  Tabs,
  Notice,
  Dialog,
  Field,
  Input,
  Menu,
  Kbd,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AISqlResponse, AIExplanation, AIOptimization, QueryExecutionResult } from "@/lib/types";

const SAMPLE_QUESTIONS = [
  "Show the top 5 customers who spent the most money",
  "List products with less than 20 units in stock",
  "Calculate monthly sales revenue for the current year",
  "Find customers who have not placed any orders yet",
];

export default function QueryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading QueryCraft...</div>}>
      <QueryContent />
    </Suspense>
  );
}

function QueryContent() {
  const searchParams = useSearchParams();
  const { activeConnection } = useAuth();
  const toast = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(true);

  // Query & NL state
  const [nlInput, setNlInput] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Response & Results
  const [aiResponse, setAiResponse] = useState<AISqlResponse | null>(null);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [optimization, setOptimization] = useState<AIOptimization | null>(null);
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(null);

  // View state
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");
  const [showSteps, setShowSteps] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [showMoreSave, setShowMoreSave] = useState(false);

  // Abort controllers for cancellation
  const generateAbortRef = useRef<AbortController | null>(null);
  const executeAbortRef = useRef<AbortController | null>(null);
  const handledPromptRef = useRef<string | null>(null);

  // Restore draft from sessionStorage
  useEffect(() => {
    if (!activeConnection) return;
    const cid = activeConnection.id;
    try {
      const savedNl = sessionStorage.getItem(`qc_draft_nl_${cid}`);
      const savedSql = sessionStorage.getItem(`qc_draft_sql_${cid}`);
      if (savedNl) setNlInput(savedNl);
      if (savedSql) setSqlQuery(savedSql);
      else setSqlQuery("SELECT * FROM products LIMIT 10;");
    } catch {}
  }, [activeConnection]);

  // Persist draft on change
  useEffect(() => {
    if (!activeConnection) return;
    const cid = activeConnection.id;
    try {
      sessionStorage.setItem(`qc_draft_nl_${cid}`, nlInput);
      sessionStorage.setItem(`qc_draft_sql_${cid}`, sqlQuery);
    } catch {}
  }, [activeConnection, nlInput, sqlQuery]);

  // Generate SQL
  const handleGenerate = useCallback(
    async (customPrompt?: string) => {
      const prompt = customPrompt || nlInput;
      if (!prompt.trim() || !activeConnection) return;

      if (generateAbortRef.current) {
        generateAbortRef.current.abort();
      }
      const controller = new AbortController();
      generateAbortRef.current = controller;

      setIsGenerating(true);
      try {
        const res = await api.generateSQL(
          {
            connection_id: activeConnection.id,
            natural_language_input: prompt.trim(),
          },
          controller.signal
        );
        setAiResponse(res);
        if (res.is_valid && res.sanitized_sql) {
          setSqlQuery(res.sanitized_sql);
        } else if (res.sql) {
          setSqlQuery(res.sql);
        }

        // Fetch explanation
        if (res.sql) {
          api
            .explainSQL(activeConnection.id, res.sanitized_sql || res.sql, controller.signal)
            .then(setExplanation)
            .catch(() => {});
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error(err.message || "Failed to generate query.");
        }
      } finally {
        setIsGenerating(false);
        generateAbortRef.current = null;
      }
    },
    [nlInput, activeConnection, toast]
  );

  // Handle URL parameters once per unique prompt
  useEffect(() => {
    const p = searchParams.get("prompt");
    const s = searchParams.get("sql");
    if (s) setSqlQuery(s);
    if (p && p !== handledPromptRef.current) {
      handledPromptRef.current = p;
      setNlInput(p);
      if (!s && activeConnection) {
        handleGenerate(p);
      }
    }
  }, [searchParams, activeConnection, handleGenerate]);

  const cancelGenerate = () => {
    if (generateAbortRef.current) {
      generateAbortRef.current.abort();
      generateAbortRef.current = null;
      setIsGenerating(false);
      toast.toast("Generation cancelled.");
    }
  };

  // Run Query
  const handleExecute = async () => {
    if (!sqlQuery.trim() || !activeConnection) return;

    if (executeAbortRef.current) {
      executeAbortRef.current.abort();
    }
    const controller = new AbortController();
    executeAbortRef.current = controller;

    setIsExecuting(true);
    try {
      const res = await api.executeSQL(
        {
          connection_id: activeConnection.id,
          sql: sqlQuery.trim(),
          natural_language_input: nlInput.trim() || undefined,
        },
        controller.signal
      );
      setQueryResult(res);
      if (res.success) {
        setActiveTab("table");
      } else {
        toast.error(res.error || "Query execution failed.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(err.message || "Failed to execute query.");
      }
    } finally {
      setIsExecuting(false);
      executeAbortRef.current = null;
    }
  };

  const cancelExecute = () => {
    if (executeAbortRef.current) {
      executeAbortRef.current.abort();
      executeAbortRef.current = null;
      setIsExecuting(false);
      toast.toast("Execution cancelled.");
    }
  };

  // Run Optimizer
  const handleOptimize = async () => {
    if (!sqlQuery.trim() || !activeConnection) return;
    setIsOptimizing(true);
    try {
      const data = await api.optimizeSQL(activeConnection.id, sqlQuery.trim());
      setOptimization(data);
      setShowOptimizer(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze query plan.");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Save Query
  const handleSaveQuery = async () => {
    if (!saveTitle.trim() || !activeConnection || !sqlQuery.trim()) return;
    try {
      await api.createSavedQuery({
        connection_id: activeConnection.id,
        title: saveTitle.trim(),
        description: saveDesc.trim() || undefined,
        natural_language_input: nlInput.trim() || undefined,
        sql_query: sqlQuery.trim(),
        tags: saveTags.trim() || undefined,
      });
      toast.success("Query saved to library.");
      setSaveDialogOpen(false);
      setSaveTitle("");
      setSaveDesc("");
      setSaveTags("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save query.");
    }
  };

  // Export actions
  const exportCsv = () => {
    if (!queryResult || !queryResult.rows.length) return;
    const cols = queryResult.columns;
    const csvRows = [cols.join(",")];
    for (const r of queryResult.rows) {
      const line = cols.map((c) => JSON.stringify(r[c] ?? "")).join(",");
      csvRows.push(line);
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file downloaded.");
  };

  const copyJson = () => {
    if (!queryResult || !queryResult.rows.length) return;
    navigator.clipboard.writeText(JSON.stringify(queryResult.rows, null, 2));
    toast.success("JSON copied to clipboard.");
  };

  const copyCsv = () => {
    if (!queryResult || !queryResult.rows.length) return;
    const cols = queryResult.columns;
    const lines = [cols.join(",")];
    for (const r of queryResult.rows) {
      lines.push(cols.map((c) => JSON.stringify(r[c] ?? "")).join(","));
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("CSV copied to clipboard.");
  };

  const handleInsertName = (name: string) => {
    setSqlQuery((prev) => (prev ? `${prev} ${name}` : name));
  };

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.mainContent}>
        <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <div className={styles.workspace}>
          <main className={styles.pageBody}>
            {/* Natural Language Question Input */}
            <div className={styles.nlCard}>
              <Textarea
                placeholder="Ask a question about your data..."
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                aria-label="Natural language query prompt"
              />

              <div className={styles.nlFooter}>
                {isGenerating ? (
                  <div className={styles.loadingRow}>
                    <span>Generating…</span>
                    <Button variant="quiet" size="sm" onClick={cancelGenerate}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Press <Kbd>Ctrl+↵</Kbd> to generate
                  </span>
                )}

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating || !nlInput.trim() || !activeConnection}
                >
                  Generate SQL
                </Button>
              </div>

              {/* Empty state example questions */}
              {!aiResponse && !nlInput.trim() ? (
                <div className={styles.emptyQuestions}>
                  <span className={styles.emptyTitle}>Example questions:</span>
                  {SAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className={styles.exampleLink}
                      onClick={() => {
                        setNlInput(q);
                        handleGenerate(q);
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* SQL Editor */}
            <SqlEditor
              value={sqlQuery}
              onChange={setSqlQuery}
              onExecute={handleExecute}
              isExecuting={isExecuting}
            />

            {/* Provenance, Explanation & Warnings */}
            {aiResponse ? (
              <div className={styles.provenanceRow}>
                <div>
                  <span className={styles.provenanceBadge}>
                    {aiResponse.source === "llm"
                      ? "Generated by your AI provider."
                      : "Generated by the built-in matcher."}
                  </span>{" "}
                  <span>{aiResponse.explanation}</span>
                </div>

                {aiResponse.notice ? (
                  <Notice variant="info">{aiResponse.notice}</Notice>
                ) : null}

                {aiResponse.warnings && aiResponse.warnings.length > 0
                  ? aiResponse.warnings.map((w, i) => (
                      <Notice key={i} variant="warning">
                        {w}
                      </Notice>
                    ))
                  : null}

                {explanation && explanation.steps.length > 0 ? (
                  <div>
                    <button
                      className={styles.stepDisclosure}
                      onClick={() => setShowSteps((v) => !v)}
                      aria-expanded={showSteps}
                    >
                      {showSteps ? "▼ Hide explanation steps" : "▶ Step by step"}
                    </button>
                    {showSteps ? (
                      <ol className={styles.stepList}>
                        {explanation.steps.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Optimizer Drawer */}
            {showOptimizer && optimization ? (
              <div className={styles.drawer}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                    Execution Plan ({optimization.dialect.toUpperCase()}) — Estimated Cost: {optimization.cost_indicator}
                  </h3>
                  <Button variant="quiet" size="sm" onClick={() => setShowOptimizer(false)}>
                    Close
                  </Button>
                </div>
                {optimization.plan.length > 0 ? (
                  <div style={{ maxHeight: "160px", overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                    {optimization.plan.map((p, i) => (
                      <div key={i}>{p.detail}</div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    No execution plan rows returned.
                  </p>
                )}
                {optimization.suggestions.length > 0 ? (
                  <div>
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Suggestions:</span>
                    <ul style={{ paddingLeft: "var(--space-4)", fontSize: "var(--text-xs)", marginTop: "4px" }}>
                      {optimization.suggestions.map((s, i) => (
                        <li key={i}>
                          <strong>{s.title}</strong>: {s.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Results Section */}
            {isExecuting ? (
              <div className={styles.loadingRow} style={{ padding: "var(--space-4)" }}>
                <span>Running query…</span>
                <Button variant="quiet" size="sm" onClick={cancelExecute}>
                  Cancel
                </Button>
              </div>
            ) : queryResult ? (
              <div>
                <div className={styles.resultsHeader}>
                  <Tabs
                    tabs={[
                      { id: "table", label: "Table" },
                      { id: "chart", label: "Chart" },
                    ]}
                    activeTab={activeTab}
                    onChange={(id) => setActiveTab(id as any)}
                  />

                  <div className={styles.resultsActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSaveDialogOpen(true)}
                    >
                      <Save size={14} strokeWidth={1.5} />
                      <span>Save query</span>
                    </Button>

                    <Menu
                      trigger={({ onClick, isOpen }) => (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={onClick}
                          aria-haspopup="menu"
                          aria-expanded={isOpen}
                        >
                          <Download size={14} strokeWidth={1.5} />
                          <span>Export</span>
                        </Button>
                      )}
                      items={[
                        { id: "csv-download", label: "Download CSV", onClick: exportCsv },
                        { id: "csv-copy", label: "Copy CSV", onClick: copyCsv },
                        { id: "json-copy", label: "Copy JSON", onClick: copyJson },
                      ]}
                    />

                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={handleOptimize}
                      disabled={isOptimizing}
                      title="Analyze EXPLAIN plan"
                    >
                      <MoreHorizontal size={14} strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>

                <div style={{ marginTop: "var(--space-3)" }}>
                  {activeTab === "table" ? (
                    <ResultsTable
                      columns={queryResult.columns}
                      rows={queryResult.rows}
                      durationMs={queryResult.duration_ms}
                    />
                  ) : (
                    <ChartView
                      columns={queryResult.columns}
                      rows={queryResult.rows}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </main>

          {/* Collapsible Tables Schema Panel */}
          {activeConnection ? (
            <TablesPanel
              connectionId={activeConnection.id}
              onInsertName={handleInsertName}
              isOpen={tablesOpen}
              onToggle={() => setTablesOpen((v) => !v)}
            />
          ) : null}
        </div>
      </div>

      {/* Save Query Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        title="Save query"
        maxWidth="440px"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveQuery} disabled={!saveTitle.trim()}>
              Save query
            </Button>
          </>
        }
      >
        <Field label="Title">
          {(props) => (
            <Input
              {...props}
              placeholder="e.g. Monthly active users"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              autoFocus
            />
          )}
        </Field>

        <button
          onClick={() => setShowMoreSave((v) => !v)}
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            textAlign: "left",
            display: "inline-block",
            marginTop: "var(--space-1)",
          }}
        >
          {showMoreSave ? "− Fewer options" : "+ More options"}
        </button>

        {showMoreSave ? (
          <>
            <Field label="Description">
              {(props) => (
                <Input
                  {...props}
                  placeholder="Optional notes about this query"
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                />
              )}
            </Field>

            <Field label="Tags">
              {(props) => (
                <Input
                  {...props}
                  placeholder="e.g. revenue, executive"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                />
              )}
            </Field>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
