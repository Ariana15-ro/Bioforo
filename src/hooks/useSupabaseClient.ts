import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

/**
 * Returns the shared Supabase client.
 * (Auth logic and mocks remain untouched — this only exposes the connection.)
 */
export function useSupabaseClient(): SupabaseClient {
  return supabase;
}
