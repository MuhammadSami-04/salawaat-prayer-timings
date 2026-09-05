import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { resolveLocation } from "@/lib/dashboard-location";
import { getAllAnnouncements } from "@/lib/queries";
import { LocationTabs } from "@/components/dashboard/LocationTabs";
import { AnnouncementManager } from "@/components/dashboard/AnnouncementManager";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await requireUser("/dashboard/announcements");
  const { location: locationId } = await searchParams;
  const location = resolveLocation(session, locationId);

  if (!location) {
    return (
      <EmptyState
        title="No locations assigned"
        description="You can post announcements once you are assigned to a mosque or hostel."
      />
    );
  }

  const announcements = await getAllAnnouncements(location.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-muted">
          Short notices shown on the public board for your locations.
        </p>
      </div>

      <LocationTabs locations={session.locations} selectedId={location.id} />

      <AnnouncementManager key={location.id} location={location} announcements={announcements} />
    </div>
  );
}
