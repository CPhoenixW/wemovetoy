"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  confirmVariant?: "primary" | "danger";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  confirmVariant = "primary",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {onConfirm ? (
          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {cancelText}
            </button>
            <button
              type="button"
              className={confirmVariant === "danger" ? "btn-danger" : "btn-primary"}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
