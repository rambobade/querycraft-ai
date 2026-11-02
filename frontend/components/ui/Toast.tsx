"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X } from "lucide-react";
import styles from "./Toast.module.css";
import { cx } from "@/lib/utils";

export interface ToastItem {
  id: string;
  message: string;
  variant?: "info" | "success" | "error";
}

interface ToastContextType {
  toast: (message: string, variant?: "info" | "success" | "error") => void;
  error: (message: string) => void;
  success: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: "info" | "success" | "error" = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const error = useCallback((message: string) => addToast(message, "error"), [addToast]);
  const success = useCallback((message: string) => addToast(message, "success"), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, error, success }}>
      {children}
      <div className={styles.container} aria-live="polite" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={cx(styles.toast, styles[t.variant || "info"])}>
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              style={{ color: "var(--text-muted)", display: "flex", padding: "2px" }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
