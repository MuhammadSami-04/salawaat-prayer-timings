import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type {
  Announcement,
  AuditLogWithMeta,
  LocationRow,
  PrayerTiming,
  SpecialPrayer,
} from "./types";

/**
 * Every active, non-deleted location. This is the single source the whole
 * public app reads from — there is no hard-coded list anywhere.
 */
export async function getActiveLocations(): Promise<LocationRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .is("deleted_at", null)
    .eq("active", true)
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return (data as LocationRow[]) ?? [];
}

export async function getLocation(id: string): Promise<LocationRow | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<LocationRow>();
  return data ?? null;
}

export async function getTiming(
  locationId: string,
  date: string,
): Promise<PrayerTiming | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("prayer_timings")
    .select("*")
    .eq("location_id", locationId)
    .eq("date", date)
    .maybeSingle<PrayerTiming>();
  return data ?? null;
}

/**
 * Falls back to the most recent published day when a specific date has no
 * row, so a student never sees a blank board because nobody has entered
 * tomorrow's times yet.
 */
export async function getTimingWithFallback(
  locationId: string,
  date: string,
): Promise<{ timing: PrayerTiming | null; isFallback: boolean; fallbackDate: string | null }> {
  const exact = await getTiming(locationId, date);
  if (exact) return { timing: exact, isFallback: false, fallbackDate: null };

  if (!isSupabaseConfigured) return { timing: null, isFallback: false, fallbackDate: null };
  const supabase = await createClient();
  const { data } = await supabase
    .from("prayer_timings")
    .select("*")
    .eq("location_id", locationId)
    .lte("date", date)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle<PrayerTiming>();

  if (!data) return { timing: null, isFallback: false, fallbackDate: null };
  return { timing: data, isFallback: true, fallbackDate: data.date };
}

/** Display name of whoever last touched a timing row. */
export async function getUpdaterName(userId: string | null): Promise<string | null> {
  if (!userId || !isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle<{ full_name: string; email: string }>();
  if (!data) return null;
  return data.full_name || data.email || null;
}

export async function getAnnouncements(locationId: string): Promise<Announcement[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("location_id", locationId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  const now = Date.now();
  return ((data as Announcement[]) ?? []).filter(
    (a) => !a.expires_at || new Date(a.expires_at).getTime() > now,
  );
}

/** Upcoming and in-progress special prayers only — past events are dropped. */
export async function getSpecialPrayers(
  locationId: string,
  fromDate: string,
): Promise<SpecialPrayer[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("special_prayers")
    .select("*")
    .eq("location_id", locationId)
    .eq("active", true)
    .order("date", { ascending: true });

  return ((data as SpecialPrayer[]) ?? []).filter(
    (prayer) => (prayer.end_date ?? prayer.date) >= fromDate,
  );
}

/** All special prayers for a location, including past ones, for editors. */
export async function getAllSpecialPrayers(locationId: string): Promise<SpecialPrayer[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("special_prayers")
    .select("*")
    .eq("location_id", locationId)
    .order("date", { ascending: false });
  return (data as SpecialPrayer[]) ?? [];
}

export async function getAllAnnouncements(locationId: string): Promise<Announcement[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false });
  return (data as Announcement[]) ?? [];
}

/**
 * Audit history. RLS already narrows this to the caller's own locations,
 * so the same query serves both an authority and the Super Admin.
 */
export async function getAuditLogs(options: {
  locationIds?: string[];
  limit?: number;
}): Promise<AuditLogWithMeta[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("*, profiles(full_name, email), locations(name, type)")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 100);

  if (options.locationIds && options.locationIds.length > 0) {
    query = query.in("location_id", options.locationIds);
  }

  const { data } = await query.returns<AuditLogWithMeta[]>();
  return data ?? [];
}

/** Live counters for the admin overview — computed, never hard-coded. */
export async function getAdminStats(): Promise<{
  mosques: number;
  hostels: number;
  authorities: number;
  activeLocations: number;
  inactiveLocations: number;
}> {
  const empty = {
    mosques: 0,
    hostels: 0,
    authorities: 0,
    activeLocations: 0,
    inactiveLocations: 0,
  };
  if (!isSupabaseConfigured) return empty;

  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };

  const [mosques, hostels, authorities, active, inactive] = await Promise.all([
    supabase.from("locations").select("id", head).is("deleted_at", null).eq("type", "mosque"),
    supabase.from("locations").select("id", head).is("deleted_at", null).eq("type", "hostel"),
    supabase.from("profiles").select("id", head).neq("role", "super_admin"),
    supabase.from("locations").select("id", head).is("deleted_at", null).eq("active", true),
    supabase.from("locations").select("id", head).is("deleted_at", null).eq("active", false),
  ]);

  return {
    mosques: mosques.count ?? 0,
    hostels: hostels.count ?? 0,
    authorities: authorities.count ?? 0,
    activeLocations: active.count ?? 0,
    inactiveLocations: inactive.count ?? 0,
  };
}

/** A location paired with its board for one date. */
export interface LocationBoard {
  location: LocationRow;
  timing: PrayerTiming | null;
}

/**
 * Every active location with its timings for one date, in a single pair of
 * queries. This feeds the campus-wide "next prayers" list, which needs all
 * locations at once to sort their upcoming jamaats against each other.
 */
export async function getBoardsForDate(date: string): Promise<LocationBoard[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();

  const [{ data: locations }, { data: timings }] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .is("deleted_at", null)
      .eq("active", true)
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<LocationRow[]>(),
    supabase
      .from("prayer_timings")
      .select("*")
      .eq("date", date)
      .returns<PrayerTiming[]>(),
  ]);

  const byLocation = new Map((timings ?? []).map((t) => [t.location_id, t]));
  return (locations ?? []).map((location) => ({
    location,
    timing: byLocation.get(location.id) ?? null,
  }));
}
