import type { APIRoute } from "astro";
import { getEnv } from "../../../shared/config/env";
import { SESSION_COOKIE } from "../../../middleware";
import { errorResponse, jsonResponse } from "../../../shared/http/api-response";
import { UnauthorizedError, ValidationError } from "../../../shared/errors/app-error";

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password) throw new ValidationError("Password is required");

    const env = getEnv();
    if (password !== env.ADMIN_PASSWORD) {
      throw new UnauthorizedError("Incorrect password");
    }

    cookies.set(SESSION_COOKIE, env.ADMIN_SESSION_SECRET, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
};
