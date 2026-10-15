import { getSupabaseServerClient } from "./supabase-server-client";

/** Thin typed wrapper around supabase.rpc() so call sites don't repeat error handling. */
export async function callRpc<T>(fnName: string, args: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc(fnName, args);
  if (error) {
    throw new Error(`RPC ${fnName} failed: ${error.message}`);
  }
  return data as T;
}
