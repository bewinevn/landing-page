import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env";

let client: SupabaseClient | null = null;

/**
 * Service-role Supabase client for server-only code (API routes,
 * module data/ layers, the Netlify scheduled function). Bypasses
 * row-level security — never import this from a browser-facing
 * component or expose it to client code.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client;
  const env = getEnv();
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return client;
}
