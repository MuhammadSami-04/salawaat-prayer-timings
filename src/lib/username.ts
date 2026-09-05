/**
 * Username-based sign-in.
 *
 * Supabase Auth is built around email addresses, but this system hands out
 * usernames like "Zakaria Authority". Rather than storing a lookup table —
 * which would need an anonymous read of the user list before login — each
 * username maps deterministically onto an address inside a namespace the
 * app owns. Nothing is ever sent to it; it exists only to give Supabase a
 * well-formed identifier.
 *
 *   "Zakaria Authority"  ->  zakaria.authority@salawaat.app
 *   "Sami Super Admin"   ->  sami.super.admin@salawaat.app
 *
 * Because the mapping is one-way and deterministic, someone can type
 * "Zakaria Authority", "zakaria authority" or "zakaria.authority" and all
 * three reach the same account.
 */

export const ACCOUNT_DOMAIN = "salawaat.app";

/** Normalises any spelling of a username into its canonical slug. */
export function toUsernameSlug(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[\s._\-]+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

/** The Supabase Auth address behind a username. */
export function usernameToEmail(username: string): string {
  return `${toUsernameSlug(username)}@${ACCOUNT_DOMAIN}`;
}

/** Recovers the username from a stored address, for display. */
export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  return local;
}

/** True when the address belongs to the app's own username namespace. */
export function isManagedAccount(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${ACCOUNT_DOMAIN}`));
}

/**
 * Suggests a username for a location, following the convention the Super
 * Admin uses: "Zakaria Hostel" becomes "Zakaria Authority".
 */
export function suggestUsername(locationName: string): string {
  const base = locationName
    .replace(/\b(hostel|hostels|mosque|masjid)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return toUsernameSlug(`${base || locationName} authority`);
}

export function validateUsername(username: string): string | null {
  const slug = toUsernameSlug(username);
  if (slug.length < 3) return "The username must be at least 3 characters.";
  if (slug.length > 64) return "The username is too long.";
  if (!/^[a-z0-9]/.test(slug)) return "The username must start with a letter or number.";
  return null;
}
