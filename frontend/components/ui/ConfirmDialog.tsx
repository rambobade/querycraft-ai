"use client";

import React from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="420px"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} size="md" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text)", lineHeight: 1.5 }}>
        {message}
      </p>
    </Dialog>
  );
}
