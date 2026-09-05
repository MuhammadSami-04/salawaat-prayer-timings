import type { LocationRow, SessionUser } from "./types";

/**
 * Resolves which of the user's locations a dashboard page is acting on.
 *
 * `?location=` wins when it names a location the user actually manages;
 * anything else falls back to their first assignment. This is what stops a
 * hand-typed id for someone else's hostel from opening its editor.
 */
export function resolveLocation(
  session: SessionUser,
  requestedId: string | undefined,
): LocationRow | null {
  if (session.locations.length === 0) return null;
  if (requestedId) {
    const match = session.locations.find((location) => location.id === requestedId);
    if (match) return match;
  }
  return session.locations[0];
}
