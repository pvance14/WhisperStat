import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { appEnv, isSupabaseConfigured } from "@/lib/env";

export type TypedSupabaseClient = SupabaseClient<Database>;

export const supabase: TypedSupabaseClient | null = isSupabaseConfigured
  ? createClient<Database>(appEnv.supabaseUrl!, appEnv.supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
};
