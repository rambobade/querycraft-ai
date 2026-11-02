"use client";

import React from "react";
import styles from "./Kbd.module.css";
import { cx } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cx(styles.kbd, className)}>{children}</kbd>;
}
