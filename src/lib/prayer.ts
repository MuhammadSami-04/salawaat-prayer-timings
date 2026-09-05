import type { PrayerTiming } from "./types";

/**
 * The five daily prayers. Adding a sixth ritual here flows through the
 * public view, the editor and the audit labels without further changes.
 */
export const DAILY_PRAYERS = [
  { key: "fajr", label: "Fajr", arabic: "الفجر" },
  { key: "zuhr", label: "Zuhr", arabic: "الظهر" },
  { key: "asr", label: "Asr", arabic: "العصر" },
  { key: "maghrib", label: "Maghrib", arabic: "المغرب" },
  { key: "isha", label: "Isha", arabic: "العشاء" },
] as const;

export type PrayerKey = (typeof DAILY_PRAYERS)[number]["key"];

export const JUMMA_FIELDS = ["jumma_1", "jumma_2", "jumma_3"] as const;
export type JummaField = (typeof JUMMA_FIELDS)[number];

export const TIMING_FIELDS = [
  ...DAILY_PRAYERS.flatMap((p) => [`${p.key}_adhan`, `${p.key}_jamaat`] as const),
  ...JUMMA_FIELDS,
] as const;

export type TimingField = (typeof TIMING_FIELDS)[number];

/** Human label for an audit-log field name, e.g. `fajr_jamaat` -> `Fajr Jamaat`. */
export function fieldLabel(field: string | null): string {
  if (!field) return "Record";
  const map: Record<string, string> = {
    jumma_1: "Jumma 1",
    jumma_2: "Jumma 2",
    jumma_3: "Jumma 3",
    notes: "Notes",
  };
  if (map[field]) return map[field];
  return field
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------
// Time helpers — the database stores `time` values as "HH:MM:SS"
// ---------------------------------------------------------------------

/** "17:05:00" -> "5:05 PM". Returns a dash for missing values. */
export function formatTime(value: string | null | undefined): string {
  const parsed = parseTime(value);
  if (!parsed) return "—";
  const { hours, minutes } = parsed;
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function parseTime(
  value: string | null | undefined,
): { hours: number; minutes: number } | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** Normalises a value from an `<input type="time">` into "HH:MM:SS", or null. */
export function toDbTime(value: string | null | undefined): string | null {
  const parsed = parseTime(value);
  if (!parsed) return null;
  return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}:00`;
}

/** Value for an `<input type="time">` ("HH:MM"), or "" when unset. */
export function toInputTime(value: string | null | undefined): string {
  const parsed = parseTime(value);
  if (!parsed) return "";
  return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
}

export function minutesSinceMidnight(value: string | null | undefined): number | null {
  const parsed = parseTime(value);
  if (!parsed) return null;
  return parsed.hours * 60 + parsed.minutes;
}

// ---------------------------------------------------------------------
// Next-prayer resolution
// ---------------------------------------------------------------------

export interface UpcomingPrayer {
  key: string;
  label: string;
  arabic: string;
  /** The time being counted down to — Jamaat where set, else Adhan. */
  time: string;
  isTomorrow: boolean;
}

/**
 * Works out which prayer is next from a day's timings, counting down to
 * the Jamaat time where one is configured and falling back to the Adhan.
 * When every prayer has passed it rolls over to tomorrow's Fajr.
 */
export function resolveNextPrayer(
  timing: PrayerTiming | null | undefined,
  now: Date,
  isFriday = now.getDay() === 5,
): UpcomingPrayer | null {
  if (!timing) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const candidates: UpcomingPrayer[] = [];

  for (const prayer of DAILY_PRAYERS) {
    // On Friday, Jumma replaces the Zuhr congregation where it is set.
    if (prayer.key === "zuhr" && isFriday && timing.jumma_1) {
      candidates.push({
        key: "jumma",
        label: "Jumma",
        arabic: "الجمعة",
        time: timing.jumma_1,
        isTomorrow: false,
      });
      if (timing.jumma_2) {
        candidates.push({
          key: "jumma_2",
          label: "Jumma 2",
          arabic: "الجمعة",
          time: timing.jumma_2,
          isTomorrow: false,
        });
      }
      if (timing.jumma_3) {
        candidates.push({
          key: "jumma_3",
          label: "Jumma 3",
          arabic: "الجمعة",
          time: timing.jumma_3,
          isTomorrow: false,
        });
      }
      continue;
    }

    const time =
      timing[`${prayer.key}_jamaat` as keyof PrayerTiming] ??
      timing[`${prayer.key}_adhan` as keyof PrayerTiming];
    if (typeof time !== "string") continue;
    candidates.push({
      key: prayer.key,
      label: prayer.label,
      arabic: prayer.arabic,
      time,
      isTomorrow: false,
    });
  }

  const sorted = candidates
    .map((c) => ({ ...c, minutes: minutesSinceMidnight(c.time) ?? 0 }))
    .sort((a, b) => a.minutes - b.minutes);

  const next = sorted.find((c) => c.minutes > nowMinutes);
  if (next) return next;

  // Everything today has passed — roll over to tomorrow's first prayer.
  const first = sorted[0];
  return first ? { ...first, isTomorrow: true } : null;
}

/** Milliseconds from `now` until a "HH:MM:SS" time today (or tomorrow). */
export function millisecondsUntil(time: string, now: Date, isTomorrow: boolean): number {
  const parsed = parseTime(time);
  if (!parsed) return 0;
  const target = new Date(now);
  target.setHours(parsed.hours, parsed.minutes, 0, 0);
  if (isTomorrow) target.setDate(target.getDate() + 1);
  return Math.max(0, target.getTime() - now.getTime());
}

/** 5_040_000 -> "01h 24m". Under a minute becomes "less than a minute". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (totalMinutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

/** Marks which prayer row should be highlighted as "current" in a list. */
export function isPrayerPassed(time: string | null, now: Date): boolean {
  const minutes = minutesSinceMidnight(time);
  if (minutes === null) return false;
  return minutes < now.getHours() * 60 + now.getMinutes();
}
