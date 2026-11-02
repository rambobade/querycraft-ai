"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Terminal, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./LibraryPage.module.css";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import {
  Tabs,
  Input,
  Select,
  Button,
  ConfirmDialog,
  EmptyState,
  Spinner,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { SavedQuery, QueryHistoryItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function LibraryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading library...</div>}>
      <LibraryContent />
    </Suspense>
  );
}

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connections } = useAuth();
  const toast = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initialTab = searchParams.get("tab") === "history" ? "history" : "saved";
  const [activeTab, setActiveTab] = useState<"saved" | "history">(initialTab);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedConn, setSelectedConn] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialog states
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: "saved" | "history" } | null>(null);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "saved") {
        const data = await api.getSavedQueries();
        setSavedQueries(data);
      } else {
        const data = await api.getQueryHistory();
        setHistoryItems(data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load library data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadData();
    setPage(1);
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (activeTab === "saved") {
      return savedQueries.filter((item) => {
        const matchesConn = selectedConn === "all" || item.connection_id === selectedConn;
        const matchesSearch =
          !term ||
          item.title.toLowerCase().includes(term) ||
          item.sql_query.toLowerCase().includes(term) ||
          (item.description && item.description.toLowerCase().includes(term));
        return matchesConn && matchesSearch;
      });
    } else {
      return historyItems.filter((item) => {
        const matchesConn = selectedConn === "all" || item.connection_id === selectedConn;
        const matchesSearch =
          !term ||
          item.executed_sql.toLowerCase().includes(term) ||
          (item.natural_language_input && item.natural_language_input.toLowerCase().includes(term));
        return matchesConn && matchesSearch;
      });
    }
  }, [activeTab, savedQueries, historyItems, search, selectedConn]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const copySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.success("SQL copied to clipboard.");
  };

  const openInQuery = (sql: string, nl?: string) => {
    const params = new URLSearchParams();
    if (sql) params.set("sql", sql);
    if (nl) params.set("prompt", nl);
    router.push(`/query?${params.toString()}`);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "saved") {
        await api.deleteSavedQuery(itemToDelete.id);
        setSavedQueries((prev) => prev.filter((q) => q.id !== itemToDelete.id));
        toast.success("Saved query deleted.");
      } else {
        await api.deleteQueryHistory(itemToDelete.id);
        setHistoryItems((prev) => prev.filter((h) => h.id !== itemToDelete.id));
        toast.success("History item deleted.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item.");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearAllHistory();
      setHistoryItems([]);
      toast.success("Query history cleared.");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear history.");
    } finally {
      setClearHistoryOpen(false);
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.mainContent}>
        <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <main className={styles.pageBody}>
          <div className={styles.headerRow}>
            <Tabs
              tabs={[
                { id: "saved", label: "Saved queries", count: savedQueries.length },
                { id: "history", label: "History", count: historyItems.length },
              ]}
              activeTab={activeTab}
              onChange={(t) => setActiveTab(t as any)}
            />

            {activeTab === "history" && historyItems.length > 0 ? (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => setClearHistoryOpen(true)}
              >
                Clear history
              </Button>
            ) : null}
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.searchBox}>
              <Input
                placeholder="Search queries..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search queries"
              />
            </div>

            <div className={styles.filterBox}>
              <Select
                value={selectedConn}
                onChange={(e) => {
                  setSelectedConn(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by database connection"
              >
                <option value="all">All connections</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>
              <Spinner label="Loading queries..." />
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title={activeTab === "saved" ? "No saved queries" : "No query history"}
              description={
                search
                  ? `No results matching "${search}".`
                  : activeTab === "saved"
                  ? "Save queries from the Query page to bookmark them for future use."
                  : "Executed queries will automatically appear in your history log."
              }
            />
          ) : (
            <div className={styles.list}>
              {pagedItems.map((item: any) => {
                const isSaved = activeTab === "saved";
                const title = isSaved ? item.title : (item.natural_language_input || "Manual query");
                const sql = isSaved ? item.sql_query : item.executed_sql;
                const date = item.created_at;

                return (
                  <div key={item.id} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{title}</span>
                      <code className={styles.itemSql}>{sql}</code>
                      <div className={styles.itemMeta}>
                        <span>{formatDate(date)}</span>
                        {!isSaved && item.execution_duration_ms ? (
                          <span>{item.execution_duration_ms} ms</span>
                        ) : null}
                        {!isSaved && typeof item.row_count === "number" ? (
                          <span>{item.row_count} rows</span>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.itemActions}>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => openInQuery(sql, isSaved ? item.natural_language_input : undefined)}
                        aria-label="Open in Query"
                        title="Open in Query"
                      >
                        <Terminal size={14} strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => copySql(sql)}
                        aria-label="Copy SQL"
                        title="Copy SQL"
                      >
                        <Copy size={14} strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => setItemToDelete({ id: item.id, type: activeTab })}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <div className={styles.pagination}>
              <span>
                Page {page} of {totalPages} ({filteredItems.length} items)
              </span>
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} strokeWidth={1.5} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight size={14} strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      <ConfirmDialog
        open={Boolean(itemToDelete)}
        title="Delete query"
        message="Are you sure you want to delete this query? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />

      <ConfirmDialog
        open={clearHistoryOpen}
        title="Clear query history"
        message="Are you sure you want to clear your entire execution history? This action cannot be undone."
        confirmLabel="Clear history"
        variant="danger"
        onConfirm={handleClearHistory}
        onCancel={() => setClearHistoryOpen(false)}
      />
    </div>
  );
}
