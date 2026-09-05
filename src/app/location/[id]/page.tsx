import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SiteHeader } from "@/components/public/SiteHeader";
import { NextPrayerCard } from "@/components/public/NextPrayerCard";
import { PrayerTimingsGrid } from "@/components/public/PrayerTimingsGrid";
import { JummaCard } from "@/components/public/JummaCard";
import { DateNavigator } from "@/components/public/DateNavigator";
import { SpecialPrayersPanel } from "@/components/public/SpecialPrayersPanel";
import { AnnouncementsPanel } from "@/components/public/AnnouncementsPanel";
import { LastUpdated } from "@/components/public/LastUpdated";
import { UpcomingPrayersFeed } from "@/components/public/UpcomingPrayersFeed";
import { Badge } from "@/components/ui/Badge";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getBoardsForDate,
  getAnnouncements,
  getLocation,
  getSpecialPrayers,
  getTimingWithFallback,
  getUpdaterName,
} from "@/lib/queries";
import { formatLongDate, formatShortDate, isTodayISO, isValidISODate, todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isSupabaseConfigured) return { title: "Prayer Timings" };
  const { id } = await params;
  const location = await getLocation(id);
  return {
    title: location ? location.name : "Prayer Timings",
    description: location
      ? `Today's Fajr, Zuhr, Asr, Maghrib, Isha and Jumma timings for ${location.name}.`
      : undefined,
  };
}

export default async function LocationPage({ params, searchParams }: PageProps) {
  if (!isSupabaseConfigured) notFound();

  const { id } = await params;
  const { date: rawDate } = await searchParams;
  const date = isValidISODate(rawDate) ? rawDate : todayISO();

  const location = await getLocation(id);
  if (!location) notFound();

  const [{ timing, isFallback, fallbackDate }, announcements, specialPrayers, boards] =
    await Promise.all([
      getTimingWithFallback(location.id, date),
      getAnnouncements(location.id),
      getSpecialPrayers(location.id, date),
      getBoardsForDate(todayISO()),
    ]);

  const updaterName = await getUpdaterName(timing?.updated_by ?? null);
  const isToday = isTodayISO(date);

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="page-container pb-16 pt-6 sm:pt-8">
        <Link
          href="/locations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All locations
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
                {location.name}
              </h1>
              <Badge tone={location.type === "mosque" ? "primary" : "accent"}>
                {location.type === "mosque" ? "Mosque" : "Hostel"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatLongDate(date)}
              {location.building ? ` · ${location.building}` : ""}
            </p>
          </div>

          <LastUpdated
            updatedAt={timing?.updated_at ?? null}
            updatedBy={updaterName}
            className="text-sm"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          {/* ---------------- primary column ---------------- */}
          <div className="space-y-4">
            <NextPrayerCard timing={timing} isToday={isToday} locationName={location.name} />

            <DateNavigator date={date} />

            {isFallback && fallbackDate ? (
              <p className="rounded-xl border border-warning/25 bg-warning-soft px-4 py-2.5 text-sm text-warning">
                No timings published for {formatShortDate(date)} yet — showing the most recent
                board from {formatShortDate(fallbackDate)}.
              </p>
            ) : null}

            <div>
              <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
                {isToday ? "Today's prayer timings" : "Prayer timings"}
              </h2>
              <PrayerTimingsGrid timing={timing} isToday={isToday && !isFallback} />
            </div>

            <JummaCard timing={timing} />

            {timing?.notes ? (
              <p className="rounded-xl border border-border-soft bg-surface px-4 py-3 text-sm text-muted">
                {timing.notes}
              </p>
            ) : null}

            <SpecialPrayersPanel prayers={specialPrayers} />
            <AnnouncementsPanel announcements={announcements} />
          </div>

          {/* ------------- campus-wide upcoming prayers ------------- */}
          <aside className="space-y-3 lg:sticky lg:top-20">
            <UpcomingPrayersFeed
              boards={boards}
              activeLocationId={location.id}
              limit={15}
              title="Next prayers across campus"
            />

            <Link
              href="/locations"
              className="flex items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface px-4 py-3.5 transition-colors card-shadow hover:border-primary/30 hover:bg-primary-soft/40"
            >
              <span className="text-sm font-medium text-foreground">
                Explore all locations
              </span>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m8 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
