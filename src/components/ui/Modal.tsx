"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight dialog built on the native <dialog> element so focus
 * trapping, Escape handling and the top layer come from the platform.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-border-soft bg-surface p-0",
        "text-foreground backdrop:bg-foreground/35 card-shadow-lg",
        className,
      )}
    >
      <div className="border-b border-border-soft px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="max-h-[65vh] overflow-y-auto scrollbar-slim px-5 py-4">{children}</div>
      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border-soft px-5 py-3">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
