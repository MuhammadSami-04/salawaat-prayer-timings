import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type { LocationRow, Profile, SessionUser } from "./types";

export { roleLabel } from "./roles";

/**
 * Resolves the signed-in user's profile together with every location they
 * are permitted to manage. Returns null when nobody is signed in.
 *
 * The Super Admin implicitly manages every location; everyone else gets
 * exactly the locations listed in `location_managers`.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.active) return null;

  const isSuperAdmin = profile.role === "super_admin";

  if (isSuperAdmin) {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .is("deleted_at", null)
      .order("type")
      .order("sort_order")
      .order("name");
    return { profile, isSuperAdmin, locations: (data as LocationRow[]) ?? [] };
  }

  const { data } = await supabase
    .from("location_managers")
    .select("locations(*)")
    .eq("user_id", user.id)
    .returns<{ locations: LocationRow | null }[]>();

  const locations = (data ?? [])
    .map((row) => row.locations)
    .filter((l): l is LocationRow => Boolean(l) && l!.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return { profile, isSuperAdmin, locations };
}

/** Server-side guard for /dashboard — redirects anonymous visitors to login. */
export async function requireUser(returnTo = "/dashboard"): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

/** Server-side guard for /admin — only the Super Admin may pass. */
export async function requireSuperAdmin(returnTo = "/admin"): Promise<SessionUser> {
  const session = await requireUser(returnTo);
  if (!session.isSuperAdmin) {
    redirect("/dashboard?error=admin-only");
  }
  return session;
}

/**
 * Second line of defence in server actions. RLS already rejects writes to
 * unassigned locations; this produces a friendly error before the round trip
 * and stops an authority from ever seeing another location's editor.
 */
export function assertCanManage(session: SessionUser, locationId: string): void {
  if (session.isSuperAdmin) return;
  const allowed = session.locations.some((l) => l.id === locationId);
  if (!allowed) {
    throw new Error("You are not assigned to this location.");
  }
}
