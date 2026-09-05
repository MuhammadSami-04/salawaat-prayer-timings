"use client";

import { useEffect, useState } from "react";

import type { PrayerTiming } from "@/lib/types";
import { DAILY_PRAYERS, formatTime, resolveNextPrayer } from "@/lib/prayer";
import { cn } from "@/lib/utils";

/**
 * Today's five prayers with Adhan and Jamaat columns. Large type, one row
 * per prayer, readable at arm's length on a phone.
 */
export function PrayerTimingsGrid({
  timing,
  isToday,
}: {
  timing: PrayerTiming | null;
  isToday: boolean;
}) {
  const [nextKey, setNextKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isToday) {
      setNextKey(null);
      return;
    }
    function tick() {
      setNextKey(resolveNextPrayer(timing, new Date())?.key ?? null);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timing, isToday]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface card-shadow">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border-soft bg-surface-muted px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-subtle sm:px-6">
        <span>Prayer</span>
        <span className="w-20 text-right sm:w-28">Adhan</span>
        <span className="w-20 text-right sm:w-28">Jamaat</span>
      </div>

      <ul>
        {DAILY_PRAYERS.map((prayer) => {
          const adhan = timing?.[`${prayer.key}_adhan`] ?? null;
          const jamaat = timing?.[`${prayer.key}_jamaat`] ?? null;
          const isNext = nextKey === prayer.key;

          return (
            <li
              key={prayer.key}
              className={cn(
                "grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border-soft px-4 py-3.5 last:border-b-0 sm:px-6 sm:py-4",
                isNext && "bg-primary-soft",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      "font-display text-lg font-semibold sm:text-xl",
                      isNext ? "text-primary" : "text-foreground",
                    )}
                  >
                    {prayer.label}
                  </span>
                  <span className="text-sm text-subtle" lang="ar" dir="rtl">
                    {prayer.arabic}
                  </span>
                  {isNext ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Next
                    </span>
                  ) : null}
                </div>
              </div>

              <span
                className={cn(
                  "tnum w-20 text-right text-base font-medium sm:w-28 sm:text-lg",
                  adhan ? "text-muted" : "text-subtle",
                )}
              >
                {formatTime(adhan)}
              </span>

              <span
                className={cn(
                  "tnum w-20 text-right text-lg font-semibold sm:w-28 sm:text-2xl",
                  jamaat ? (isNext ? "text-primary" : "text-foreground") : "text-subtle",
                )}
              >
                {formatTime(jamaat)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
