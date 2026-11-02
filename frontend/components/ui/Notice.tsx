"use client";

import React from "react";
import styles from "./Notice.module.css";
import { cx } from "@/lib/utils";

export interface NoticeProps {
  variant?: "info" | "warning" | "error" | "success";
  className?: string;
  children: React.ReactNode;
}

export function Notice({ variant = "info", className, children }: NoticeProps) {
  return (
    <div className={cx(styles.notice, styles[variant], className)} role="status">
      {children}
    </div>
  );
}
