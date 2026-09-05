/** Date helpers that keep the app on calendar dates, free of timezone drift. */

/** "2026-09-05" for a Date, using local time rather than UTC. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses "2026-09-05" as a local date (not UTC midnight). */
export function fromISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function shiftDate(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** "Saturday, September 5, 2026" */
export function formatLongDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** "Sep 5, 2026" */
export function formatShortDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isFridayISO(iso: string): boolean {
  return fromISODate(iso).getDay() === 5;
}

export function isTodayISO(iso: string): boolean {
  return iso === todayISO();
}

/** Guards against malformed `?date=` query values. */
export function isValidISODate(value: string | undefined | null): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromISODate(value);
  return !Number.isNaN(date.getTime()) && toISODate(date) === value;
}

/** "12 minutes ago", "3 hours ago", "just now". */
export function timeAgo(timestamp: string | null | undefined, now = new Date()): string {
  if (!timestamp) return "never";
  const then = new Date(timestamp);
  if (Number.isNaN(then.getTime())) return "never";

  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";

  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [2592000, "day"],
    [31536000, "month"],
    [Infinity, "year"],
  ];

  const divisors: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    month: 2592000,
    year: 31536000,
  };

  for (const [limit, unit] of units) {
    if (seconds < limit) {
      const value = Math.floor(seconds / divisors[unit]);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-value, unit);
    }
  }
  return "a long time ago";
}

/** "Sep 5, 2026 — 11:42 AM" for audit rows. */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} — ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
