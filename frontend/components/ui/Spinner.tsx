"use client";

import React from "react";
import styles from "./Spinner.module.css";
import { cx } from "@/lib/utils";

export interface SpinnerProps {
  label?: string;
  className?: string;
}

export function Spinner({ label = "Loading...", className }: SpinnerProps) {
  return (
    <span className={cx(styles.spinner, className)} role="status" aria-label={label} />
  );
}
