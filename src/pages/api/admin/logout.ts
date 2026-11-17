import type { APIRoute } from "astro";
import { SESSION_COOKIE } from "../../../middleware";
import { jsonResponse } from "../../../shared/http/api-response";

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return jsonResponse({ ok: true });
};
