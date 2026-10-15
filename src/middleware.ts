import { defineMiddleware } from "astro:middleware";
import { getEnv } from "./shared/config/env";
import { errorResponse } from "./shared/http/api-response";
import { UnauthorizedError } from "./shared/errors/app-error";

const SESSION_COOKIE = "admin_session";

function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return cookieValue === getEnv().ADMIN_SESSION_SECRET;
}

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";

  if (!isAdminPage && !isAdminApi) {
    return next();
  }

  const authed = isAuthenticated(context.cookies.get(SESSION_COOKIE)?.value);
  if (authed) {
    return next();
  }

  if (isAdminApi) {
    return errorResponse(new UnauthorizedError("Admin session required"));
  }

  return context.redirect("/admin/login");
});

export { SESSION_COOKIE };
