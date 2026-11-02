"use client";

import React, { forwardRef } from "react";
import styles from "./Textarea.module.css";
import { cx } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cx(styles.textarea, isError && styles.error, className)}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
