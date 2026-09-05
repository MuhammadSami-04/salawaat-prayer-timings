// =====================================================================
// Database types — mirror of the Supabase schema in supabase/migrations
// =====================================================================

export type UserRole = "super_admin" | "mosque_authority" | "hostel_authority";
export type LocationType = "mosque" | "hostel";
export type SpecialPrayerType = "eid_fitr" | "eid_adha" | "taraweeh";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationRow {
  id: string;
  name: string;
  type: LocationType;
  description: string | null;
  building: string | null;
  contact: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LocationManager {
  id: string;
  user_id: string;
  location_id: string;
  created_at: string;
}

export interface PrayerTiming {
  id: string;
  location_id: string;
  date: string;
  fajr_adhan: string | null;
  fajr_jamaat: string | null;
  zuhr_adhan: string | null;
  zuhr_jamaat: string | null;
  asr_adhan: string | null;
  asr_jamaat: string | null;
  maghrib_adhan: string | null;
  maghrib_jamaat: string | null;
  isha_adhan: string | null;
  isha_jamaat: string | null;
  jumma_1: string | null;
  jumma_2: string | null;
  jumma_3: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface SpecialPrayer {
  id: string;
  location_id: string;
  type: SpecialPrayerType;
  date: string;
  end_date: string | null;
  prayer_time: string | null;
  rakah: string | null;
  announcement: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Announcement {
  id: string;
  location_id: string;
  title: string;
  message: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  location_id: string | null;
  entity: string;
  record_id: string | null;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// ------------------------- joined view models ------------------------

export interface AuditLogWithMeta extends AuditLog {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  locations: Pick<LocationRow, "name" | "type"> | null;
}

export interface AuthorityWithLocations extends Profile {
  location_managers: { location_id: string; locations: Pick<LocationRow, "id" | "name" | "type"> | null }[];
}

/** A profile plus everything the app needs to decide what it may render. */
export interface SessionUser {
  profile: Profile;
  isSuperAdmin: boolean;
  locations: LocationRow[];
}
