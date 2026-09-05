import type { Metadata } from "next";

import { SiteHeader } from "@/components/public/SiteHeader";
import { SetupNotice } from "@/components/public/SetupNotice";
import { LocationPicker } from "@/components/public/LocationPicker";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getActiveLocations } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Locations",
  description: "Every mosque and hostel with published prayer timings.",
};

export default async function LocationsPage() {
  const locations = isSupabaseConfigured ? await getActiveLocations() : [];
  const mosques = locations.filter((l) => l.type === "mosque");
  const hostels = locations.filter((l) => l.type === "hostel");

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="page-container pb-16 pt-8">
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          All locations
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mosques.length} {mosques.length === 1 ? "mosque" : "mosques"} and {hostels.length}{" "}
          {hostels.length === 1 ? "hostel" : "hostels"} currently publishing timings.
        </p>

        <div className="mt-6">
          {!isSupabaseConfigured ? <SetupNotice /> : <LocationPicker locations={locations} />}
        </div>
      </main>
    </div>
  );
}
