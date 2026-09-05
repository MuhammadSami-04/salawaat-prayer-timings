"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { formatLongDate, isTodayISO, shiftDate, todayISO } from "@/lib/date";

/** Previous / next day stepper plus a date input, driven by `?date=`. */
export function DateNavigator({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (isTodayISO(nextDate)) {
      params.delete("date");
    } else {
      params.set("date", nextDate);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border-soft bg-surface p-2 card-shadow">
      <button
        type="button"
        onClick={() => go(shiftDate(date, -1))}
        aria-label="Previous day"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1 text-center">
        <label className="block cursor-pointer">
          <span className="sr-only">Choose a date</span>
          <span className="block truncate text-sm font-semibold text-foreground sm:text-base">
            {formatLongDate(date)}
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => event.target.value && go(event.target.value)}
            className="sr-only"
          />
        </label>
        {isTodayISO(date) ? (
          <span className="text-xs font-medium text-primary">Today</span>
        ) : (
          <button
            type="button"
            onClick={() => go(todayISO())}
            className="text-xs font-medium text-accent-foreground underline underline-offset-2"
          >
            Back to today
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => go(shiftDate(date, 1))}
        aria-label="Next day"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m8 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
