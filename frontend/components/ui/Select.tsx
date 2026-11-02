"use client";

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Select.module.css";
import { cx } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    return (
      <div className={cx(styles.selectWrapper, wrapperClassName)}>
        <select ref={ref} className={cx(styles.select, className)} {...props}>
          {children}
        </select>
        <ChevronDown size={14} strokeWidth={1.5} className={styles.chevron} aria-hidden="true" />
      </div>
    );
  }
);

Select.displayName = "Select";
