import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role client. Bypasses RLS, so it is used for exactly one thing:
 * letting the Super Admin provision authority accounts in Supabase Auth.
 *
 * `server-only` makes the build fail if this module is ever pulled into a
 * client bundle, and the key is never exposed with a NEXT_PUBLIC_ prefix.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local to create authority accounts.",
    );
  }
  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
