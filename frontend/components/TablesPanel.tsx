"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import styles from "./TablesPanel.module.css";
import { Input, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { DatabaseSchema, TableSchema } from "@/lib/types";

export interface TablesPanelProps {
  connectionId: string;
  onInsertName: (name: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function TablesPanel({ connectionId, onInsertName, isOpen, onToggle }: TablesPanelProps) {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!connectionId) return;
    let active = true;
    setLoading(true);
    api
      .getSchema(connectionId)
      .then((data) => {
        if (active) {
          setSchema(data);
          const initialExpanded: Record<string, boolean> = {};
          data.tables.forEach((t) => {
            initialExpanded[t.name] = false;
          });
          setExpandedTables(initialExpanded);
        }
      })
      .catch(() => {
        if (active) setSchema(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [connectionId]);

  const toggleTable = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredTables = (schema?.tables || []).filter((tbl) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      tbl.name.toLowerCase().includes(term) ||
      tbl.columns.some((c) => c.name.toLowerCase().includes(term))
    );
  });

  if (!isOpen) return null;

  return (
    <aside className={styles.panel} aria-label="Tables and columns explorer">
      <div className={styles.header}>
        <span className={styles.title}>Tables ({schema?.table_count || 0})</span>
        <button
          onClick={onToggle}
          aria-label="Close tables panel"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          Hide
        </button>
      </div>

      <div className={styles.searchBox}>
        <Input
          placeholder="Filter tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Filter tables"
        />
      </div>

      <div className={styles.tableList}>
        {loading ? (
          <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-muted)" }}>
            <Spinner label="Loading schema..." />
          </div>
        ) : filteredTables.length === 0 ? (
          <div style={{ padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            No matching tables
          </div>
        ) : (
          filteredTables.map((tbl) => {
            const isExp = Boolean(expandedTables[tbl.name]);
            return (
              <div key={tbl.name} className={styles.tableItem}>
                <div
                  className={styles.tableRow}
                  onClick={() => onInsertName(tbl.name)}
                  title="Click to insert table name into query"
                >
                  <div className={styles.tableName}>
                    <button
                      onClick={(e) => toggleTable(tbl.name, e)}
                      aria-label={isExp ? `Collapse ${tbl.name}` : `Expand ${tbl.name}`}
                      style={{ display: "flex", padding: 0 }}
                    >
                      {isExp ? (
                        <ChevronDown size={14} strokeWidth={1.5} />
                      ) : (
                        <ChevronRight size={14} strokeWidth={1.5} />
                      )}
                    </button>
                    <span>{tbl.name}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tbl.row_count}</span>
                </div>

                {isExp ? (
                  <div className={styles.columnList}>
                    {tbl.columns.map((col) => (
                      <div
                        key={col.name}
                        className={styles.columnRow}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsertName(col.name);
                        }}
                        title="Click to insert column name"
                      >
                        <span className={col.primary_key ? styles.pk : undefined}>{col.name}</span>
                        <span className={styles.colType}>{col.type}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
