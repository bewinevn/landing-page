import type { APIRoute } from "astro";
import { getEnv } from "../../../../shared/config/env";

/**
 * Kicks off the one-time Zalo OA OAuth linking. Protected by the
 * existing admin session middleware (see src/middleware.ts) — only an
 * authenticated admin should be able to (re-)link the OA. Redirects to
 * Zalo's consent screen; Zalo then redirects back to ./callback with
 * a `code` to exchange for the first access/refresh token pair.
 *
 * The redirect URI used here must be added to this app's allowed
 * OAuth redirect URIs in the Zalo Developers dashboard beforehand.
 */
export const GET: APIRoute = async ({ url }) => {
  const env = getEnv();
  if (!env.ZALO_APP_ID) {
    return new Response("ZALO_APP_ID is not configured", { status: 500 });
  }

  const redirectUri = new URL("/api/admin/zalo/callback", url.origin).toString();
  const authorizeUrl = new URL("https://oauth.zaloapp.com/v4/oa/permission");
  authorizeUrl.searchParams.set("app_id", env.ZALO_APP_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);

  return Response.redirect(authorizeUrl.toString(), 302);
};
