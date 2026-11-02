"use client";

import React, { useState, useMemo } from "react";
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, Database, AlertCircle } from "lucide-react";

interface ResultsTableProps {
  columns: string[];
  rows: Record<string, any>[];
  durationMs: number;
  warnings?: string[];
  error?: string;
}

export function ResultsTable({ columns, rows, durationMs, warnings, error }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Handle Sort
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  // Filter & Sort Rows
  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    let result = [...rows];

    // Filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => val !== null && String(val).toLowerCase().includes(lower))
      );
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [rows, searchTerm, sortColumn, sortDirection]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (!rows || rows.length === 0) return;
    const headerLine = columns.join(",");
    const csvLines = rows.map((r) =>
      columns.map((c) => {
        const cell = r[c] === null ? "" : String(r[c]);
        return `"${cell.replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csvContent = [headerLine, ...csvLines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `query_result_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300">
        <div className="flex items-center gap-2 mb-2 font-semibold">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <span>Execution Blocked or Failed</span>
        </div>
        <p className="text-sm font-mono text-rose-200/90 bg-rose-950/40 p-3 rounded-lg border border-rose-900/60 break-words">
          {error}
        </p>
      </div>
    );
  }

  if (!columns || columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-sm">
        <Database className="h-10 w-10 text-slate-700 mb-3" />
        <p>No query results to display.</p>
        <p className="text-xs text-slate-600 mt-1">Execute a SELECT query above or generate one with AI.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Top Header / Stats */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">Query Output</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[11px]">
            {rows.length} rows returned
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            Execution time: <strong className="text-slate-200">{durationMs} ms</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter results..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
            />
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {warnings && warnings.length > 0 && (
        <div className="px-4 py-2 bg-amber-950/20 border-b border-amber-900/30 text-amber-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{warnings.join("; ")}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0b101d] sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-semibold select-none">
            <tr>
              <th className="py-2.5 px-3 w-12 text-slate-600 font-mono text-center">#</th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="py-2.5 px-3 font-mono cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-600" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-slate-500">
                  No records match your search filter.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 text-slate-600 text-center font-mono">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="py-2 px-3 truncate max-w-xs">
                      {row[col] === null ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : typeof row[col] === "boolean" ? (
                        <span className={row[col] ? "text-emerald-400" : "text-rose-400"}>
                          {String(row[col])}
                        </span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-500 text-[11px]">
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-slate-300 font-medium">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
