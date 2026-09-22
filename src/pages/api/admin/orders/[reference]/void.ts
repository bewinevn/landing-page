import type { APIRoute } from "astro";
import { voidManualOrder } from "../../../../../modules/orders";
import { errorResponse, jsonResponse } from "../../../../../shared/http/api-response";

/** Deletes a manually-entered order typed in by mistake. See voidManualOrder for the scoping rules. */
export const POST: APIRoute = async ({ params }) => {
  try {
    await voidManualOrder(params.reference!);
    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
};
