"use client";

import React from "react";
import styles from "./Tabs.module.css";
import { cx } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cx(styles.tabList, className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={cx(styles.tab, isActive && styles.active)}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {typeof tab.count === "number" ? ` (${tab.count})` : null}
          </button>
        );
      })}
    </div>
  );
}
