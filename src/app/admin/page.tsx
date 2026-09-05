import Link from "next/link";
import type { Metadata } from "next";

import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdminStats } from "@/lib/queries";
import { AssignmentBoard } from "@/components/dashboard/AssignmentBoard";
import type { AuthorityWithLocations, LocationRow } from "@/lib/types";

export const metadata: Metadata = { title: "Assignments" };

/**
 * The Super Admin's home screen. Its job is assignment: which mosque or
 * hostel exists, and who is allowed to keep its timings current. Reporting
 * lives on the other tabs.
 */
export default async function AdminPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const [stats, { data: locations }, { data: authorities }] = await Promise.all([
    getAdminStats(),
    supabase
      .from("locations")
      .select("*")
      .is("deleted_at", null)
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<LocationRow[]>(),
    supabase
      .from("profiles")
      .select("*, location_managers(location_id, locations(id, name, type))")
      .order("full_name", { ascending: true })
      .returns<AuthorityWithLocations[]>(),
  ]);

  const canProvision = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const chips = [
    { label: stats.mosques === 1 ? "mosque" : "mosques", value: stats.mosques },
    { label: stats.hostels === 1 ? "hostel" : "hostels", value: stats.hostels },
    { label: stats.authorities === 1 ? "authority" : "authorities", value: stats.authorities },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Assignments
          </h1>
          <p className="mt-1 text-sm text-muted">
            Add a mosque or hostel, then assign the people who manage its timings.
          </p>
        </div>

        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.label}
              className="rounded-xl border border-border-soft bg-surface px-3 py-1.5 text-sm"
            >
              <span className="tnum font-semibold text-primary">{chip.value}</span>{" "}
              <span className="text-muted">{chip.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <AssignmentBoard
        locations={locations ?? []}
        authorities={authorities ?? []}
        canProvision={canProvision}
      />

      <p className="text-sm text-muted">
        Need more detail?{" "}
        <Link href="/admin/authorities" className="font-medium text-primary underline underline-offset-4">
          Manage authorities
        </Link>{" "}
        ·{" "}
        <Link href="/admin/locations" className="font-medium text-primary underline underline-offset-4">
          Edit locations
        </Link>{" "}
        ·{" "}
        <Link href="/admin/logs" className="font-medium text-primary underline underline-offset-4">
          Audit logs
        </Link>
      </p>
    </div>
  );
}
