import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { resolveLocation } from "@/lib/dashboard-location";
import { getTiming } from "@/lib/queries";
import { isValidISODate, todayISO } from "@/lib/date";
import { LocationTabs } from "@/components/dashboard/LocationTabs";
import { TimingEditor } from "@/components/dashboard/TimingEditor";
import { DateNavigator } from "@/components/public/DateNavigator";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Prayer Timings" };

export default async function TimingsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; date?: string }>;
}) {
  const session = await requireUser("/dashboard/timings");
  const { location: locationId, date: rawDate } = await searchParams;

  const location = resolveLocation(session, locationId);
  const date = isValidISODate(rawDate) ? rawDate : todayISO();

  if (!location) {
    return (
      <EmptyState
        title="No locations assigned"
        description="You need at least one assigned mosque or hostel before you can publish timings."
      />
    );
  }

  const timing = await getTiming(location.id, date);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Edit prayer timings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Update every prayer for one day, then save the whole board at once.
        </p>
      </div>

      <LocationTabs locations={session.locations} selectedId={location.id} />

      <DateNavigator date={date} />

      {/* `key` forces fresh defaultValues when the day or location changes. */}
      <TimingEditor
        key={`${location.id}-${date}`}
        location={location}
        date={date}
        timing={timing}
      />
    </div>
  );
}
