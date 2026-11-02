"use client";

import React, { useId } from "react";
import styles from "./Field.module.css";
import { cx } from "@/lib/utils";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; isError?: boolean }) => React.ReactNode;
}

export function Field({ label, hint, error, className, children }: FieldProps) {
  const generatedId = useId();
  const inputId = `field-${generatedId}`;
  const hintId = hint ? `hint-${generatedId}` : undefined;
  const errorId = error ? `error-${generatedId}` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      </div>
      {children({ id: inputId, "aria-describedby": describedBy, isError: Boolean(error) })}
      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
