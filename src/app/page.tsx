import Link from "next/link";

import { SiteHeader } from "@/components/public/SiteHeader";
import { SetupNotice } from "@/components/public/SetupNotice";
import { CampusSearch } from "@/components/public/CampusSearch";
import { LiveClock } from "@/components/public/LiveClock";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getBoardsForDate } from "@/lib/queries";
import { formatLongDate, todayISO } from "@/lib/date";
import { GITHUB_REPO } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Public home. The board leads with what is actually happening next across
 * the whole campus; browsing the full list of locations is a step away
 * behind "Explore locations" rather than filling the page.
 */
export default async function HomePage() {
  const today = todayISO();
  const boards = isSupabaseConfigured ? await getBoardsForDate(today) : [];

  const mosques = boards.filter((b) => b.location.type === "mosque").length;
  const hostels = boards.filter((b) => b.location.type === "hostel").length;

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="page-container pb-16 pt-6 sm:pt-10">
        <section className="mb-7 px-2 py-10 text-center sm:py-12">
          <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
            University Prayer Timings
          </h1>
          <p className="mt-2 text-sm text-muted">{formatLongDate(today)}</p>
          <p className="tnum mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
            <LiveClock />
          </p>
        </section>

        {!isSupabaseConfigured ? (
          <SetupNotice />
        ) : (
          <div className="space-y-4">
            <CampusSearch boards={boards} />

            <Link
              href="/locations"
              className="flex items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface px-5 py-4 transition-colors card-shadow hover:border-primary/30 hover:bg-primary-soft/40"
            >
              <span>
                <span className="block font-display text-base font-semibold text-foreground">
                  Explore locations
                </span>
                <span className="block text-sm text-muted">
                  {boards.length === 0
                    ? "No mosques or hostels added yet"
                    : `Search all ${mosques} ${mosques === 1 ? "mosque" : "mosques"} and ${hostels} ${hostels === 1 ? "hostel" : "hostels"}`}
                </span>
              </span>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="h-5 w-5 shrink-0 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m8 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        )}
      </main>

      <footer className="border-t border-border-soft py-6 text-center text-xs text-subtle">
        <p>Timings are maintained by each mosque and hostel authority</p>
        <p className="mt-1.5">
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-primary"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            {GITHUB_REPO}
          </a>
        </p>
      </footer>
    </div>
  );
}
