import { AppError } from "../errors/app-error";

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Maps a thrown error to a JSON error response, logging unexpected ones. */
export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return jsonResponse({ error: { code: err.code, message: err.message } }, err.httpStatus);
  }
  console.error("Unhandled API error:", err);
  return jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, 500);
}
