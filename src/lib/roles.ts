import type { UserRole } from "./types";

/**
 * Kept apart from lib/auth so client components can label a role without
 * pulling the server-side Supabase client into the browser bundle.
 */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "mosque_authority":
      return "Mosque Authority";
    case "hostel_authority":
      return "Hostel Authority";
    default:
      return role;
  }
}
