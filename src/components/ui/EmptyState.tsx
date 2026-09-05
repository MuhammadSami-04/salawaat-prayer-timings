import * as React from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface-muted/50 px-6 py-12 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
