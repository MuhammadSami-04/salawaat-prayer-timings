import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Supabase client for server components, route handlers and server
 * actions. Runs as the signed-in user, so every query is filtered by the
 * RLS policies in supabase/migrations/0002_rls.sql.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — the middleware refreshes the
          // session cookie instead, so this is safe to ignore.
        }
      },
    },
  });
}
