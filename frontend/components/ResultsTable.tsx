"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ResultsTable.module.css";
import { Input, Button, EmptyState } from "@/components/ui";
import { cx } from "@/lib/utils";

export interface ResultsTableProps {
  columns: string[];
  rows: Record<string, any>[];
  durationMs?: number;
  totalCapHit?: boolean;
}

export function ResultsTable({ columns, rows, durationMs }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Identify numeric columns
  const numericColumns = useMemo(() => {
    const set = new Set<string>();
    if (!rows || rows.length === 0) return set;
    for (const col of columns) {
      const nonNull = rows.find((r) => r[col] !== null && r[col] !== undefined);
      if (nonNull && typeof nonNull[col] === "number") {
        set.add(col);
      }
    }
    return set;
  }, [columns, rows]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  const filteredAndSortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    let list = [...rows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((r) =>
        Object.values(r).some((v) => v !== null && String(v).toLowerCase().includes(term))
      );
    }

    if (sortCol) {
      list.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        return sortDir === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [rows, searchTerm, sortCol, sortDir]);

  const totalPages = Math.ceil(filteredAndSortedRows.length / pageSize) || 1;
  const pagedRows = filteredAndSortedRows.slice((page - 1) * pageSize, page * pageSize);

  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return <EmptyState title="No rows returned" description="The query executed successfully but produced no rows." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.filterInput}>
          <Input
            placeholder="Filter table rows..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            aria-label="Filter rows"
          />
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {filteredAndSortedRows.length} rows {durationMs !== undefined ? `· ${durationMs} ms` : null}
          {rows.length >= 1000 ? " (Showing the first 1,000 rows)" : null}
        </div>
      </div>

      <div className={styles.tableWrapper} role="region" aria-label="Query results data table" tabIndex={0}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {columns.map((col) => {
                const isNumeric = numericColumns.has(col);
                const isSorted = sortCol === col;
                return (
                  <th
                    key={col}
                    className={cx(styles.th, isNumeric && styles.numeric)}
                    onClick={() => handleSort(col)}
                    aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    {col}
                    {isSorted ? (sortDir === "asc" ? " ↑" : " ↓") : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => (
              <tr key={idx} className={styles.tr}>
                {columns.map((col) => {
                  const val = row[col];
                  const isNumeric = numericColumns.has(col);
                  return (
                    <td key={col} className={cx(styles.td, isNumeric && styles.numeric)}>
                      {val === null || val === undefined ? (
                        <span className={styles.nullVal}>null</span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className={styles.pagination}>
          <span>
            Page {page} of {totalPages}
          </span>
          <div className={styles.pageButtons}>
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
    </div>
  );
}
