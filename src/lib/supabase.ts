import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client singleton.
 *
 * Reads the public URL and anon key from Vite env vars:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * If the vars are missing the app still boots (using mock data elsewhere) and
 * only warns — the client is constructed with placeholders so nothing crashes.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no definidas. " +
      "La app usa datos mock hasta configurar Supabase.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
