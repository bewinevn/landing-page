import type { APIRoute } from "astro";
import { handleProviderWebhook } from "../../../modules/webhooks";
import { errorResponse, jsonResponse } from "../../../shared/http/api-response";

/**
 * Real provider webhook endpoint. The shape is wired now (signature
 * verification -> parse -> apply -> ack) but the sepay provider
 * itself is a not-implemented stub per the approved plan, so this
 * route will currently reject every call with 401 until a real
 * provider is configured (PAYMENT_PROVIDER=sepay + real credentials).
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => (headers[key] = value));

    const result = await handleProviderWebhook({ headers, rawBody });
    return jsonResponse(result.body, result.status);
  } catch (err) {
    return errorResponse(err);
  }
};
