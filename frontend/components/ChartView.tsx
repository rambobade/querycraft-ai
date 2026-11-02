"use client";

import React, { useState, useMemo } from "react";
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
  Legend,
} from "recharts";
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Info } from "lucide-react";

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
  "#06b6d4", "#f97316", "#14b8a6", "#3b82f6", "#e11d48",
];

interface ChartViewProps {
  columns: string[];
  rows: Record<string, any>[];
}

export function ChartView({ columns, rows }: ChartViewProps) {
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");

  // Determine potential label (categorical) and value (numerical) columns
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

  const [xAxisKey, setXAxisKey] = useState<string>("");
  const [yAxisKey, setYAxisKey] = useState<string>("");

  // Set default keys once columns change
  React.useEffect(() => {
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

  // Format data for Recharts
  const chartData = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return rows.slice(0, 50).map((row) => ({
      ...row,
      [xAxisKey]: String(row[xAxisKey] ?? ""),
      [yAxisKey]: Number(row[yAxisKey] ?? 0),
    }));
  }, [rows, xAxisKey, yAxisKey]);

  if (!rows || rows.length === 0 || columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-sm">
        <BarChart3 className="h-10 w-10 text-slate-700 mb-3" />
        <p>No data available to plot charts.</p>
      </div>
    );
  }

  if (numericalCols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-amber-950/20 border border-amber-900/40 rounded-xl text-amber-300 text-sm">
        <Info className="h-6 w-6 text-amber-400 mb-2" />
        <p className="font-semibold">No numerical metrics detected in query results.</p>
        <p className="text-xs text-amber-400/80 mt-1">
          To visualize charts, ensure your query includes at least one quantitative column (e.g. `COUNT()`, `SUM()`, `price`).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Chart Toolbar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Chart Type Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setChartType("bar")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              chartType === "bar" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Bar Chart</span>
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              chartType === "line" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            <span>Line Chart</span>
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              chartType === "pie" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <PieChartIcon className="h-3.5 w-3.5" />
            <span>Pie Chart</span>
          </button>
        </div>

        {/* Axis Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">X-Axis (Category):</span>
            <select
              value={xAxisKey}
              onChange={(e) => setXAxisKey(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Y-Axis (Value):</span>
            <select
              value={yAxisKey}
              onChange={(e) => setYAxisKey(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
            >
              {numericalCols.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-[340px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey={xAxisKey} stroke="#64748b" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem", color: "#f8fafc" }}
                itemStyle={{ color: "#818cf8" }}
              />
              <Legend />
              <Bar dataKey={yAxisKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey={xAxisKey} stroke="#64748b" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem", color: "#f8fafc" }}
                itemStyle={{ color: "#10b981" }}
              />
              <Legend />
              <Line type="monotone" dataKey={yAxisKey} stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem", color: "#f8fafc" }}
              />
              <Legend />
              <Pie
                data={chartData}
                dataKey={yAxisKey}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={105}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
