import { getEnv } from "../../../shared/config/env";
import { ValidationError } from "../../../shared/errors/app-error";
import * as tokenRepository from "../data/zalo-token.repository";

const TOKEN_ENDPOINT = "https://oauth.zaloapp.com/v4/oa/access_token";
// Refresh a bit before actual expiry so a slow request never races the
// token going stale mid-call.
const REFRESH_BUFFER_MS = 5 * 60_000;

interface ZaloTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
  error?: number;
  error_name?: string;
  error_reason?: string;
}

function requireAppCredentials(): { appId: string; appSecret: string } {
  const env = getEnv();
  if (!env.ZALO_APP_ID || !env.ZALO_APP_SECRET) {
    throw new ValidationError("ZALO_APP_ID / ZALO_APP_SECRET not configured");
  }
  return { appId: env.ZALO_APP_ID, appSecret: env.ZALO_APP_SECRET };
}

async function callTokenEndpoint(appSecret: string, body: URLSearchParams): Promise<ZaloTokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: appSecret,
    },
    body,
  });
  const data = (await res.json()) as ZaloTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(`Zalo token endpoint failed: ${JSON.stringify(data)}`);
  }
  return data;
}

/** One-time exchange of the OAuth `code` (from the /authorize redirect) for the first token pair. */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const { appId, appSecret } = requireAppCredentials();
  const data = await callTokenEndpoint(
    appSecret,
    new URLSearchParams({ code, app_id: appId, grant_type: "authorization_code" }),
  );
  await persistTokens(data);
}

async function refreshTokens(refreshToken: string): Promise<string> {
  const { appId, appSecret } = requireAppCredentials();
  const data = await callTokenEndpoint(
    appSecret,
    new URLSearchParams({ refresh_token: refreshToken, app_id: appId, grant_type: "refresh_token" }),
  );
  await persistTokens(data);
  return data.access_token!;
}

async function persistTokens(data: ZaloTokenResponse): Promise<void> {
  const expiresInSec = Number(data.expires_in ?? "0");
  await tokenRepository.saveTokens({
    accessToken: data.access_token!,
    // Zalo rotates the refresh_token on every refresh — always save
    // whatever came back, never reuse the old one.
    refreshToken: data.refresh_token!,
    expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString(),
  });
}

/**
 * Returns a currently-valid access token, transparently refreshing
 * (and persisting the rotated refresh_token) when the stored one is
 * near expiry. Throws if OAuth was never completed — see
 * /api/admin/zalo/authorize.
 */
export async function getValidAccessToken(): Promise<string> {
  const row = await tokenRepository.getTokens();
  if (!row) {
    throw new ValidationError("Zalo OA not linked yet — visit /api/admin/zalo/authorize to complete OAuth");
  }

  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt - Date.now() > REFRESH_BUFFER_MS) {
    return row.access_token;
  }

  return refreshTokens(row.refresh_token);
}
