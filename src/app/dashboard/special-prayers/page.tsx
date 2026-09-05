import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { resolveLocation } from "@/lib/dashboard-location";
import { getAllSpecialPrayers } from "@/lib/queries";
import { LocationTabs } from "@/components/dashboard/LocationTabs";
import { SpecialPrayerManager } from "@/components/dashboard/SpecialPrayerManager";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Special Prayers" };

export default async function SpecialPrayersPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await requireUser("/dashboard/special-prayers");
  const { location: locationId } = await searchParams;
  const location = resolveLocation(session, locationId);

  if (!location) {
    return (
      <EmptyState
        title="No locations assigned"
        description="You need an assigned mosque or hostel before you can configure Eid or Taraweeh."
      />
    );
  }

  const prayers = await getAllSpecialPrayers(location.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Special prayers &amp; events
        </h1>
        <p className="mt-1 text-sm text-muted">
          Eid-ul-Fitr, Eid-ul-Adha and Taraweeh for your locations.
        </p>
      </div>

      <LocationTabs locations={session.locations} selectedId={location.id} />

      <SpecialPrayerManager key={location.id} location={location} prayers={prayers} />
    </div>
  );
}
