"use client";

import React, { forwardRef } from "react";
import styles from "./Input.module.css";
import { cx } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, isError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(styles.input, isError && styles.error, className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
