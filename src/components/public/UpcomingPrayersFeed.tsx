"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { LocationBoard } from "@/lib/queries";
import type { LocationType } from "@/lib/types";
import {
  formatCountdown,
  formatTime,
  millisecondsUntil,
  resolveNextPrayer,
  type UpcomingPrayer,
} from "@/lib/prayer";
import { cn } from "@/lib/utils";

type Filter = "all" | LocationType;

interface FeedEntry {
  locationId: string;
  locationName: string;
  locationType: LocationType;
  prayer: UpcomingPrayer;
  remaining: number;
}

/**
 * Campus-wide jamaat schedule, soonest first.
 *
 * Each location contributes one row: whichever of its prayers is next. So
 * when Zuhr is at 1:45 in one mosque and 1:50 in another, they sit in that
 * order — and once every Zuhr has passed, those rows become Asr on their
 * own, without any special handling for the changeover.
 */
export function UpcomingPrayersFeed({
  boards,
  activeLocationId,
  limit = 12,
  title = "Next prayers across campus",
}: {
  boards: LocationBoard[];
  activeLocationId?: string;
  limit?: number;
  title?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [entries, setEntries] = useState<FeedEntry[] | null>(null);

  const counts = useMemo(
    () => ({
      all: boards.length,
      mosque: boards.filter((b) => b.location.type === "mosque").length,
      hostel: boards.filter((b) => b.location.type === "hostel").length,
    }),
    [boards],
  );

  useEffect(() => {
    function tick() {
      const now = new Date();
      const isFriday = now.getDay() === 5;

      const next = boards
        .map((board): FeedEntry | null => {
          const prayer = resolveNextPrayer(board.timing, now, isFriday);
          if (!prayer) return null;
          return {
            locationId: board.location.id,
            locationName: board.location.name,
            locationType: board.location.type,
            prayer,
            remaining: millisecondsUntil(prayer.time, now, prayer.isTomorrow),
          };
        })
        .filter((entry): entry is FeedEntry => entry !== null)
        .sort((a, b) => a.remaining - b.remaining);

      setEntries(next);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [boards]);

  // Null until the first client tick, so server and client markup agree.
  const visible = (entries ?? [])
    .filter((entry) => filter === "all" || entry.locationType === filter)
    .slice(0, limit);

  return (
    <section className="rounded-2xl border border-border-soft bg-surface card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft px-4 py-3 sm:px-5">
        <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">
          {title}
        </h2>
        <div className="flex gap-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "mosque", label: "Mosques" },
              { key: "hostel", label: "Hostels" },
            ] as const
          ).map((tab) =>
            counts[tab.key] === 0 ? null : (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                aria-pressed={filter === tab.key}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-muted text-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ),
          )}
        </div>
      </div>

      {entries === null ? (
        <ul className="divide-y divide-[var(--border)]" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="h-9 w-16 rounded-lg bg-surface-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/5 rounded bg-surface-muted" />
                <div className="h-2.5 w-1/4 rounded bg-surface-muted" />
              </div>
            </li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          {boards.length === 0
            ? "No locations have been added yet."
            : "No timings published for today yet."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {visible.map((entry, index) => {
            const isSoonest = index === 0;
            const isActive = entry.locationId === activeLocationId;

            return (
              <li key={entry.locationId}>
                <Link
                  href={`/location/${entry.locationId}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors sm:px-5 sm:py-3.5",
                    isSoonest ? "bg-primary-soft" : "hover:bg-surface-muted",
                    isActive && !isSoonest && "bg-accent-soft/50",
                  )}
                >
                  <span
                    className={cn(
                      "tnum shrink-0 rounded-lg px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums sm:text-base",
                      isSoonest
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-muted text-foreground",
                    )}
                  >
                    {formatTime(entry.prayer.time)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-medium sm:text-[15px]",
                        isSoonest ? "text-primary" : "text-foreground",
                      )}
                    >
                      {entry.locationName}
                    </span>
                    <span className="block truncate text-xs text-subtle">
                      {entry.prayer.label}
                      {entry.prayer.isTomorrow ? " · tomorrow" : ""}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "tnum shrink-0 text-right text-xs font-medium sm:text-sm",
                      isSoonest ? "text-primary" : "text-muted",
                    )}
                    suppressHydrationWarning
                  >
                    {formatCountdown(entry.remaining)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
