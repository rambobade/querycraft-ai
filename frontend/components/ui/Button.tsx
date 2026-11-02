"use client";

import React, { forwardRef } from "react";
import styles from "./Button.module.css";
import { cx } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cx(styles.button, styles[variant], styles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
