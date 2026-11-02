"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import styles from "./ChartView.module.css";
import { Select, EmptyState } from "@/components/ui";

const PALETTE = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#3b82f6",
];

export interface ChartViewProps {
  columns: string[];
  rows: Record<string, any>[];
}

export function ChartView({ columns, rows }: ChartViewProps) {
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [xAxisKey, setXAxisKey] = useState<string>("");
  const [yAxisKey, setYAxisKey] = useState<string>("");

  const { categoricalCols, numericalCols } = useMemo(() => {
    if (!rows || rows.length === 0) return { categoricalCols: [], numericalCols: [] };
    const sample = rows[0];
    const cat: string[] = [];
    const num: string[] = [];

    columns.forEach((col) => {
      const val = sample[col];
      if (typeof val === "number" || (!isNaN(Number(val)) && val !== "" && val !== null)) {
        num.push(col);
      } else {
        cat.push(col);
      }
    });

    return { categoricalCols: cat, numericalCols: num };
  }, [columns, rows]);

  useEffect(() => {
    if (categoricalCols.length > 0) {
      setXAxisKey(categoricalCols[0]);
    } else if (columns.length > 0) {
      setXAxisKey(columns[0]);
    }

    if (numericalCols.length > 0) {
      setYAxisKey(numericalCols[0]);
    } else if (columns.length > 1) {
      setYAxisKey(columns[1]);
    }
  }, [categoricalCols, numericalCols, columns]);

  const chartData = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return rows.slice(0, 50).map((r) => ({
      ...r,
      [xAxisKey]: String(r[xAxisKey] ?? ""),
      [yAxisKey]: Number(r[yAxisKey]) || 0,
    }));
  }, [rows, xAxisKey, yAxisKey]);

  if (!rows || rows.length === 0 || columns.length === 0) {
    return <EmptyState title="No data for chart" description="Run a query that returns rows to visualize data." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.label}>Type:</span>
          <Select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            aria-label="Chart type"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </Select>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>X Axis:</span>
          <Select
            value={xAxisKey}
            onChange={(e) => setXAxisKey(e.target.value)}
            aria-label="X axis column"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </Select>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>Y Axis:</span>
          <Select
            value={yAxisKey}
            onChange={(e) => setYAxisKey(e.target.value)}
            aria-label="Y axis column"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className={styles.chartArea} role="region" aria-label="Visual data chart">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey={xAxisKey} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-xs)",
                }}
              />
              <Bar dataKey={yAxisKey} fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey={xAxisKey} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-xs)",
                }}
              />
              <Line type="monotone" dataKey={yAxisKey} stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-xs)",
                }}
              />
              <Pie
                data={chartData}
                dataKey={yAxisKey}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
