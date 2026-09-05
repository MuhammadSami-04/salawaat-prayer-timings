import type { Metadata } from "next";

import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LocationManager } from "@/components/dashboard/LocationManager";
import type { LocationRow } from "@/lib/types";

export const metadata: Metadata = { title: "Locations" };

export default async function AdminLocationsPage() {
  await requireSuperAdmin("/admin/locations");

  // Includes soft-deleted rows so the admin can restore them.
  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  const locations = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Location management
        </h1>
        <p className="mt-1 text-sm text-muted">
          Add, rename, hide or remove mosques and hostels. There is no limit on how many the
          system holds.
        </p>
      </div>

      <LocationManager locations={locations} />
    </div>
  );
}
