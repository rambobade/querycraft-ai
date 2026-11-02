"use client";

import React, { useState, useEffect } from "react";
import { DatabaseSchema, TableSchema } from "@/lib/types";
import { api } from "@/lib/api";
import {
  Database,
  Table,
  Columns,
  Key,
  Link as LinkIcon,
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Plus,
} from "lucide-react";

interface SchemaTreeProps {
  connectionId?: string;
  onInsertSnippet?: (snippet: string) => void;
}

export function SchemaTree({ connectionId, onInsertSnippet }: SchemaTreeProps) {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const fetchSchema = async () => {
    if (!connectionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSchema(connectionId);
      setSchema(data);
      // Expand first 2 tables by default
      const initial: Record<string, boolean> = {};
      data.tables.slice(0, 2).forEach((t) => {
        initial[t.name] = true;
      });
      setExpandedTables(initial);
    } catch (e: any) {
      setError(e.message || "Failed to introspect database schema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [connectionId]);

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  const filteredTables = (schema?.tables || []).filter((tbl) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesTable = tbl.name.toLowerCase().includes(term);
    const matchesColumn = tbl.columns.some((c) => c.name.toLowerCase().includes(term));
    return matchesTable || matchesColumn;
  });

  return (
    <div className="flex flex-col h-full bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-sm text-xs">
      {/* Header */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Schema Explorer</span>
          {schema && (
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
              {schema.tables.length} tables
            </span>
          )}
        </div>
        <button
          onClick={fetchSchema}
          disabled={loading || !connectionId}
          title="Refresh Schema"
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-950">
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tables or columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin mr-2 text-indigo-400" />
            <span>Introspecting schema...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-rose-400 bg-rose-950/20 rounded border border-rose-900/30 text-[11px]">
            {error}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="py-6 text-center text-slate-500">
            {connectionId ? "No tables found." : "Select a database connection above."}
          </div>
        ) : (
          filteredTables.map((tbl) => {
            const isExpanded = !!expandedTables[tbl.name];
            return (
              <div key={tbl.name} className="border border-slate-800/60 rounded-lg overflow-hidden bg-slate-900/40">
                {/* Table Row Header */}
                <div
                  className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-800/60 cursor-pointer select-none transition-colors"
                  onClick={() => toggleTable(tbl.name)}
                >
                  <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <Table className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{tbl.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({tbl.row_count} rows)</span>
                  </div>

                  {onInsertSnippet && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInsertSnippet(`SELECT * FROM ${tbl.name} LIMIT 10;`);
                      }}
                      title={`Query ${tbl.name}`}
                      className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/40 rounded transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Columns Accordion Body */}
                {isExpanded && (
                  <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/60 space-y-1.5">
                    {tbl.columns.map((col) => (
                      <div key={col.name} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                        <div className="flex items-center gap-1.5 truncate">
                          {col.primary_key ? (
                            <span title="Primary Key">
                              <Key className="h-3 w-3 text-amber-400 flex-shrink-0" />
                            </span>
                          ) : (
                            <Columns className="h-3 w-3 text-slate-600 flex-shrink-0" />
                          )}
                          <span className={col.primary_key ? "text-amber-300 font-semibold truncate" : "truncate"}>
                            {col.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                          {col.primary_key && (
                            <span className="px-1 rounded bg-amber-950 text-amber-400 border border-amber-800/80">
                              PK
                            </span>
                          )}
                          <span>{col.type}</span>
                        </div>
                      </div>
                    ))}

                    {/* Foreign Key references */}
                    {tbl.foreign_keys && tbl.foreign_keys.length > 0 && (
                      <div className="pt-1 border-t border-slate-800/60 space-y-1">
                        {tbl.foreign_keys.map((fk, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-[10px] text-indigo-400 font-mono">
                            <LinkIcon className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">
                              {fk.constrained_columns.join(", ")} &rarr; {fk.referred_table}({fk.referred_columns.join(", ")})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
