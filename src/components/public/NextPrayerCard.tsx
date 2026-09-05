"use client";

import { useEffect, useState } from "react";

import type { PrayerTiming } from "@/lib/types";
import {
  formatCountdown,
  formatTime,
  millisecondsUntil,
  resolveNextPrayer,
  type UpcomingPrayer,
} from "@/lib/prayer";

/**
 * The hero of the public dashboard: which prayer is next and how long is
 * left. Recomputed every second on the client, so it stays correct even if
 * the page has been open since morning.
 */
export function NextPrayerCard({
  timing,
  isToday,
  locationName,
}: {
  timing: PrayerTiming | null;
  isToday: boolean;
  locationName: string;
}) {
  const [state, setState] = useState<{ next: UpcomingPrayer | null; remaining: number } | null>(
    null,
  );

  useEffect(() => {
    if (!isToday) {
      setState(null);
      return;
    }

    function tick() {
      const now = new Date();
      const next = resolveNextPrayer(timing, now);
      setState({
        next,
        remaining: next ? millisecondsUntil(next.time, now, next.isTomorrow) : 0,
      });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timing, isToday]);

  if (!isToday) {
    return (
      <div className="rounded-2xl border border-border-soft bg-surface-muted px-5 py-6 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
          Viewing another date
        </p>
        <p className="mt-2 text-sm text-muted">
          The live countdown returns when you go back to today.
        </p>
      </div>
    );
  }

  const next = state?.next ?? null;

  if (!next) {
    return (
      <div className="rounded-2xl border border-border-soft bg-surface-muted px-5 py-6 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Next prayer</p>
        <p className="mt-2 text-sm text-muted">
          No timings published for {locationName} today.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-inverse px-5 py-7 text-primary-foreground card-shadow-lg sm:px-8 sm:py-8">
      {/* Arch motif echoing the logo, purely decorative */}
      <svg
        aria-hidden
        viewBox="0 0 120 160"
        className="pointer-events-none absolute -right-6 -top-10 h-48 w-36 opacity-[0.18] sm:h-56 sm:w-44"
      >
        <path
          d="M60 4C36 34 14 52 14 88v68h92V88c0-36-22-54-46-84Z"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
        />
      </svg>

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Next prayer</p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-4xl font-semibold text-primary-foreground sm:text-5xl">
              {next.label}
            </h2>
            <span className="text-lg text-accent/90" lang="ar" dir="rtl">
              {next.arabic}
            </span>
          </div>
          <p className="mt-1 tnum text-2xl font-semibold text-primary-foreground/95 sm:text-3xl">
            {formatTime(next.time)}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="tnum text-3xl font-semibold text-accent sm:text-4xl" suppressHydrationWarning>
            {formatCountdown(state?.remaining ?? 0)}
          </p>
          <p className="mt-0.5 text-sm text-primary-foreground/70">
            {next.isTomorrow ? "until tomorrow's first prayer" : "remaining"}
          </p>
        </div>
      </div>
    </div>
  );
}
