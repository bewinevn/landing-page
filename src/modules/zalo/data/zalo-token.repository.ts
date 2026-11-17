import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";

export interface ZaloTokenRow {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  updated_at: string;
}

export async function getTokens(): Promise<ZaloTokenRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("zalo_oa_tokens").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`getTokens failed: ${error.message}`);
  return data as ZaloTokenRow | null;
}

export async function saveTokens(input: {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("zalo_oa_tokens").upsert({
    id: 1,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    expires_at: input.expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`saveTokens failed: ${error.message}`);
}
