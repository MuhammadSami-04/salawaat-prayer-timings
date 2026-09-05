"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { LocationBoard } from "@/lib/queries";
import {
  DAILY_PRAYERS,
  JUMMA_FIELDS,
  formatCountdown,
  formatTime,
  millisecondsUntil,
  resolveNextPrayer,
  type UpcomingPrayer,
} from "@/lib/prayer";
import { fuzzyScore, matchPrayer, parseTimeQuery, PRAYER_LABELS, timeDistance } from "@/lib/search";
import { cn } from "@/lib/utils";

interface Upcoming {
  locationId: string;
  locationName: string;
  locationType: "mosque" | "hostel";
  prayer: UpcomingPrayer;
  remaining: number;
}

/** A single prayer at a single location, used by the search results. */
interface Slot {
  locationId: string;
  locationName: string;
  prayerKey: string;
  prayerLabel: string;
  time: string;
}

function collectSlots(boards: LocationBoard[]): Slot[] {
  const slots: Slot[] = [];
  for (const { location, timing } of boards) {
    if (!timing) continue;
    for (const prayer of DAILY_PRAYERS) {
      const time = timing[`${prayer.key}_jamaat`] ?? timing[`${prayer.key}_adhan`];
      if (typeof time === "string") {
        slots.push({
          locationId: location.id,
          locationName: location.name,
          prayerKey: prayer.key,
          prayerLabel: prayer.label,
          time,
        });
      }
    }
    JUMMA_FIELDS.forEach((field, index) => {
      const time = timing[field];
      if (typeof time === "string") {
        slots.push({
          locationId: location.id,
          locationName: location.name,
          prayerKey: "jumma",
          prayerLabel: index === 0 ? "Jumma" : `Jumma ${index + 1}`,
          time,
        });
      }
    });
  }
  return slots;
}

/**
 * The public board's search and schedule.
 *
 * With no query it leads with the single nearest jamaat on campus, stated
 * as plainly and as large as the page allows, with everything else beside
 * it as a table. A query switches the view: a location name shows that
 * location's whole day, a prayer name shows that prayer everywhere, and a
 * time shows whatever is happening around it.
 */
export function CampusSearch({ boards }: { boards: LocationBoard[] }) {
  const [query, setQuery] = useState("");
  const [upcoming, setUpcoming] = useState<Upcoming[] | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const isFriday = now.getDay() === 5;
      setUpcoming(
        boards
          .map((board): Upcoming | null => {
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
          .filter((e): e is Upcoming => e !== null)
          .sort((a, b) => a.remaining - b.remaining),
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [boards]);

  const trimmed = query.trim();
  const slots = useMemo(() => collectSlots(boards), [boards]);

  const results = useMemo(() => {
    if (!trimmed) return null;

    // A query made only of digits, colons and am/pm is a time, and is read
    // as one before any name matching gets a chance at it.
    const looksLikeTime = /^[\d\s:.]+(am|pm)?$/i.test(trimmed);
    const timeFirst = looksLikeTime ? parseTimeQuery(trimmed) : null;
    if (timeFirst !== null) {
      const near = slots
        .map((s) => ({ slot: s, distance: timeDistance(s.time, timeFirst) ?? 9999 }))
        .filter((x) => x.distance <= 60)
        .sort((a, b) => a.distance - b.distance || a.slot.time.localeCompare(b.slot.time));
      return { kind: "time" as const, minutes: timeFirst, slots: near.map((n) => n.slot) };
    }

    // 1. A location name — show that location's whole day.
    const locations = boards
      .map((b) => ({ board: b, score: fuzzyScore(trimmed, b.location.name) }))
      .filter((x) => x.score > 0.45)
      .sort((a, b) => b.score - a.score);
    if (locations.length > 0) {
      return { kind: "locations" as const, locations: locations.map((l) => l.board) };
    }

    // 2. A prayer name — show that prayer across every location.
    const prayerKey = matchPrayer(trimmed);
    if (prayerKey) {
      const matched = slots
        .filter((s) => s.prayerKey === prayerKey)
        .sort((a, b) => a.time.localeCompare(b.time));
      return { kind: "prayer" as const, label: PRAYER_LABELS[prayerKey] ?? prayerKey, slots: matched };
    }

    // 3. A time — show whatever sits within an hour of it.
    const minutes = parseTimeQuery(trimmed);
    if (minutes !== null) {
      const near = slots
        .map((s) => ({ slot: s, distance: timeDistance(s.time, minutes) ?? 9999 }))
        .filter((x) => x.distance <= 60)
        .sort((a, b) => a.distance - b.distance || a.slot.time.localeCompare(b.slot.time));
      return { kind: "time" as const, minutes, slots: near.map((n) => n.slot) };
    }

    return { kind: "none" as const };
  }, [trimmed, boards, slots]);

  const soonest = upcoming?.[0] ?? null;
  const rest = upcoming?.slice(1) ?? [];

  return (
    <div className="space-y-5">
      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a hostel, mosque, prayer or time…"
          aria-label="Search a hostel, mosque, prayer or time"
          className="h-13 w-full rounded-xl border border-border-strong bg-surface py-3.5 pl-11 pr-4 text-base text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {trimmed ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      {results ? (
        <SearchResults results={results} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
          <NextPrayerHero soonest={soonest} loading={upcoming === null} />
          <UpcomingTable rows={rest} loading={upcoming === null} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NextPrayerHero({ soonest, loading }: { soonest: Upcoming | null; loading: boolean }) {
  if (loading) {
    return <div className="h-64 rounded-2xl bg-surface-inverse/90" />;
  }
  if (!soonest) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-border-soft bg-surface px-6 py-10 text-center card-shadow">
        <p className="text-sm text-muted">No timings published for today yet.</p>
      </div>
    );
  }

  return (
    <Link
      href={`/location/${soonest.locationId}`}
      className="relative block overflow-hidden rounded-2xl bg-surface-inverse px-6 py-7 text-primary-foreground transition-transform card-shadow-lg hover:-translate-y-0.5 sm:px-8 sm:py-8"
    >
      {/* Arch motif echoing the logo, purely decorative */}
      <svg
        aria-hidden
        viewBox="0 0 120 160"
        className="pointer-events-none absolute -right-8 -top-10 h-56 w-40 opacity-[0.18]"
      >
        <path
          d="M60 4C36 34 14 52 14 88v68h92V88c0-36-22-54-46-84Z"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
        />
      </svg>

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Next prayer</p>

      <p className="mt-3 font-display text-2xl font-semibold leading-tight text-primary-foreground sm:text-3xl">
        {soonest.locationName}
      </p>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-xl font-semibold text-primary-foreground/90 sm:text-2xl">
          {soonest.prayer.label}
        </span>
        <span className="text-base text-accent/90" lang="ar" dir="rtl">
          {soonest.prayer.arabic}
        </span>
      </div>

      {/* The whole point of the page: the time, as large as it will go. */}
      <p className="tnum mt-4 font-display text-6xl font-semibold leading-none text-primary-foreground sm:text-7xl">
        {formatTime(soonest.prayer.time)}
      </p>

      <p className="tnum mt-3 text-sm font-medium text-accent" suppressHydrationWarning>
        {soonest.prayer.isTomorrow
          ? `in ${formatCountdown(soonest.remaining)} · tomorrow`
          : `in ${formatCountdown(soonest.remaining)}`}
      </p>
    </Link>
  );
}

function UpcomingTable({ rows, loading }: { rows: Upcoming[]; loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-soft bg-surface card-shadow">
      <div className="border-b border-border-soft px-4 py-3 sm:px-5">
        <h2 className="font-display text-base font-semibold text-foreground">
          Then across campus
        </h2>
      </div>

      {loading ? (
        <div className="h-56" />
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">Nothing else scheduled today.</p>
      ) : (
        <ul className="max-h-[26rem] divide-y divide-[var(--border)] overflow-y-auto scrollbar-slim">
          {rows.map((row) => (
            <li key={row.locationId}>
              <Link
                href={`/location/${row.locationId}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted sm:px-5"
              >
                <span className="tnum w-20 shrink-0 text-sm font-semibold text-foreground sm:w-24 sm:text-[15px]">
                  {formatTime(row.prayer.time)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {row.locationName}
                </span>
                <span className="shrink-0 text-xs text-subtle">{row.prayer.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

type Results =
  | { kind: "locations"; locations: LocationBoard[] }
  | { kind: "prayer"; label: string; slots: Slot[] }
  | { kind: "time"; minutes: number; slots: Slot[] }
  | { kind: "none" };

function SearchResults({ results }: { results: Results }) {
  if (results.kind === "none") {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface-muted/40 px-6 py-12 text-center">
        <p className="font-medium text-foreground">Nothing matched that search</p>
        <p className="mt-1 text-sm text-muted">
          Try a hostel or mosque name, a prayer such as “Fajr”, or a time like “5:30”.
        </p>
      </div>
    );
  }

  if (results.kind === "locations") {
    return (
      <div className="space-y-4">
        {results.locations.map((board) => (
          <LocationBoardCard key={board.location.id} board={board} />
        ))}
      </div>
    );
  }

  const heading =
    results.kind === "prayer"
      ? `${results.label} across campus`
      : `Around ${formatTime(
          `${String(Math.floor(results.minutes / 60)).padStart(2, "0")}:${String(
            results.minutes % 60,
          ).padStart(2, "0")}:00`,
        )}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-border-soft bg-surface card-shadow">
      <div className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-3">
        <h2 className="font-display text-base font-semibold text-foreground">{heading}</h2>
        <span className="text-sm text-subtle">{results.slots.length}</span>
      </div>
      {results.slots.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          No location has published this yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {results.slots.map((slot, index) => (
            <li key={`${slot.locationId}-${slot.prayerKey}-${index}`}>
              <Link
                href={`/location/${slot.locationId}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted"
              >
                <span className="tnum w-24 shrink-0 font-semibold text-foreground">
                  {formatTime(slot.time)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {slot.locationName}
                </span>
                <span className="shrink-0 text-xs text-subtle">{slot.prayerLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * A matched location's whole day — every prayer the authority has entered,
 * with the next one still to come picked out.
 */
function LocationBoardCard({ board }: { board: LocationBoard }) {
  const { location, timing } = board;
  const [nextKey, setNextKey] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      setNextKey(resolveNextPrayer(timing, new Date())?.key ?? null);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timing]);

  const jumma = JUMMA_FIELDS.map((field, index) => ({
    label: index === 0 ? "Jumma" : `Jumma ${index + 1}`,
    time: timing?.[field] ?? null,
  })).filter((j) => j.time);

  return (
    <section className="overflow-hidden rounded-2xl border border-border-soft bg-surface card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft px-5 py-3.5">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">{location.name}</h2>
          {location.building ? (
            <p className="text-xs text-subtle">{location.building}</p>
          ) : null}
        </div>
        <Link
          href={`/location/${location.id}`}
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          Open
        </Link>
      </div>

      {!timing ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          No timings published for today yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border-soft bg-surface-muted px-5 py-2 text-xs font-semibold uppercase tracking-wider text-subtle">
            <span>Prayer</span>
            <span className="w-20 text-right sm:w-24">Adhan</span>
            <span className="w-20 text-right sm:w-24">Jamaat</span>
          </div>
          <ul>
            {DAILY_PRAYERS.map((prayer) => {
              const isNext = nextKey === prayer.key;
              return (
                <li
                  key={prayer.key}
                  className={cn(
                    "grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border-soft px-5 py-3 last:border-b-0",
                    isNext && "bg-primary-soft",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-display text-base font-semibold",
                        isNext ? "text-primary" : "text-foreground",
                      )}
                    >
                      {prayer.label}
                    </span>
                    {isNext ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                        Next
                      </span>
                    ) : null}
                  </span>
                  <span className="tnum w-20 text-right text-sm text-muted sm:w-24">
                    {formatTime(timing[`${prayer.key}_adhan`])}
                  </span>
                  <span
                    className={cn(
                      "tnum w-20 text-right text-base font-semibold sm:w-24 sm:text-lg",
                      isNext ? "text-primary" : "text-foreground",
                    )}
                  >
                    {formatTime(timing[`${prayer.key}_jamaat`])}
                  </span>
                </li>
              );
            })}
          </ul>

          {jumma.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-border-soft bg-accent-soft/50 px-5 py-3">
              {jumma.map((j) => (
                <span key={j.label} className="text-sm text-accent-foreground">
                  <span className="font-medium">{j.label}</span>{" "}
                  <span className="tnum font-semibold">{formatTime(j.time)}</span>
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
