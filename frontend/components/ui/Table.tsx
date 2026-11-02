"use client";

import React from "react";
import styles from "./Table.module.css";
import { cx } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  isNumeric?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  onSort?: (key: string) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onSort,
  sortColumn,
  sortDirection,
  className,
}: TableProps<T>) {
  return (
    <div className={cx(styles.wrapper, className)}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              return (
                <th
                  key={col.key}
                  className={cx(
                    styles.th,
                    col.isNumeric && styles.numeric,
                    onSort && styles.thSortable
                  )}
                  onClick={() => onSort?.(col.key)}
                >
                  {col.header}
                  {isSorted ? (sortDirection === "asc" ? " ↑" : " ↓") : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const key = keyField && row[keyField] ? String(row[keyField]) : String(idx);
            return (
              <tr key={key} className={styles.tr}>
                {columns.map((col) => {
                  const val = row[col.key];
                  return (
                    <td
                      key={col.key}
                      className={cx(styles.td, col.isNumeric && styles.numeric)}
                    >
                      {col.render ? (
                        col.render(row)
                      ) : val === null || val === undefined ? (
                        <span className={styles.nullVal}>null</span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
