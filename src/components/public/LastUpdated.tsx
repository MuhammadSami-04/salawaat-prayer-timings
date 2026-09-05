import { timeAgo } from "@/lib/date";

/** Tells students whether what they're reading is current, and who set it. */
export function LastUpdated({
  updatedAt,
  updatedBy,
  className,
}: {
  updatedAt: string | null;
  updatedBy: string | null;
  className?: string;
}) {
  if (!updatedAt) {
    return (
      <p className={className}>
        <span className="text-subtle">No timings published yet</span>
      </p>
    );
  }

  return (
    <p className={className}>
      <span className="text-muted">Last updated {timeAgo(updatedAt)}</span>
      {updatedBy ? <span className="text-subtle"> · by {updatedBy}</span> : null}
    </p>
  );
}
