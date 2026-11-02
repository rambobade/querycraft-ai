"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./Dialog.module.css";
import { Button } from "./Button";
import { cx } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!isInDialog) {
        onClose();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("click", handleClickOutside);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={cx(styles.dialog, className)}
      style={maxWidth ? { maxWidth } : undefined}
      aria-labelledby="dialog-title"
    >
      <div className={styles.header}>
        <h2 id="dialog-title" className={styles.title}>
          {title}
        </h2>
        <Button
          variant="quiet"
          size="sm"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={16} strokeWidth={1.5} />
        </Button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </dialog>
  );
}
