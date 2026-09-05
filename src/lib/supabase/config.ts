/**
 * Central place where Supabase credentials are read.
 *
 * The anon key is safe in the browser (RLS is the real guard). The
 * service-role key is read ONLY from server-side modules and is never
 * imported into a client component.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the project has been pointed at a real Supabase instance. */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
