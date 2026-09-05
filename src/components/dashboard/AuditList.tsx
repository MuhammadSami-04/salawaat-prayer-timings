import type { AuditLogWithMeta } from "@/lib/types";
import { fieldLabel, formatTime } from "@/lib/prayer";
import { formatTimestamp } from "@/lib/date";
import { Badge } from "@/components/ui/Badge";

const ENTITY_LABELS: Record<string, string> = {
  prayer_timings: "Prayer timings",
  special_prayers: "Special prayer",
  announcements: "Announcement",
  locations: "Location",
};

const ACTION_TONES = {
  create: "success",
  update: "primary",
  delete: "danger",
} as const;

/**
 * Renders one audit entry. Timing changes read as "04:40 AM → 04:45 AM";
 * everything else reads as a plain before/after, because a location name
 * is not a clock value.
 */
function AuditChange({ log }: { log: AuditLogWithMeta }) {
  const isTiming = log.entity === "prayer_timings" && log.field_changed !== "notes";
  const format = (value: string | null) =>
    value === null ? null : isTiming ? formatTime(value) : value;

  const oldValue = format(log.old_value);
  const newValue = format(log.new_value);

  if (!oldValue && !newValue) {
    return <span className="text-muted">{ENTITY_LABELS[log.entity] ?? log.entity}</span>;
  }

  return (
    <span className="text-muted">
      {log.field_changed ? (
        <span className="font-medium text-foreground">{fieldLabel(log.field_changed)}</span>
      ) : (
        <span className="font-medium text-foreground">
          {ENTITY_LABELS[log.entity] ?? log.entity}
        </span>
      )}{" "}
      {oldValue ? <span className="tnum line-through opacity-70">{oldValue}</span> : null}
      {oldValue && newValue ? <span aria-label="changed to"> → </span> : null}
      {newValue ? <span className="tnum font-semibold text-foreground">{newValue}</span> : null}
    </span>
  );
}

export function AuditList({
  logs,
  showLocation = true,
}: {
  logs: AuditLogWithMeta[];
  showLocation?: boolean;
}) {
  if (logs.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted">No changes recorded yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {logs.map((log) => (
        <li key={log.id} className="px-5 py-3.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Badge tone={ACTION_TONES[log.action as keyof typeof ACTION_TONES] ?? "neutral"}>
              {log.action}
            </Badge>
            {showLocation ? (
              <span className="font-medium text-foreground">
                {log.locations?.name ?? "Removed location"}
              </span>
            ) : null}
            <AuditChange log={log} />
          </div>

          <p className="mt-1 text-xs text-subtle">
            {formatTimestamp(log.created_at)}
            {log.profiles?.full_name || log.profiles?.email ? (
              <> · by {log.profiles.full_name || log.profiles.email}</>
            ) : (
              <> · by the system</>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
