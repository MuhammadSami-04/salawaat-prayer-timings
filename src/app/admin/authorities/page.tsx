import type { Metadata } from "next";

import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthorityManager } from "@/components/dashboard/AuthorityManager";
import { Alert } from "@/components/ui/Alert";
import type { AuthorityWithLocations, LocationRow } from "@/lib/types";

export const metadata: Metadata = { title: "Authorities" };

export default async function AdminAuthoritiesPage() {
  const session = await requireSuperAdmin("/admin/authorities");
  const supabase = await createClient();

  const [{ data: profiles }, { data: locations }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, location_managers(location_id, locations(id, name, type))")
      .order("role", { ascending: true })
      .order("full_name", { ascending: true })
      .returns<AuthorityWithLocations[]>(),
    supabase
      .from("locations")
      .select("*")
      .is("deleted_at", null)
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<LocationRow[]>(),
  ]);

  const canProvision = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Authority management
        </h1>
        <p className="mt-1 text-sm text-muted">
          Create accounts and assign them to locations. A mosque may have any number of Qari
          Sahabs, and one person may cover several locations.
        </p>
      </div>

      {canProvision ? null : (
        <Alert tone="warning" title="Account creation is unavailable">
          Set <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code> to create or
          delete authority accounts. Assignments and role changes work without it.
        </Alert>
      )}

      <AuthorityManager
        authorities={profiles ?? []}
        locations={locations ?? []}
        currentUserId={session.profile.id}
      />
    </div>
  );
}
