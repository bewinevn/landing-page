import type { APIRoute } from "astro";
import { getOrderStatus } from "../../../../modules/orders";
import { errorResponse, jsonResponse } from "../../../../shared/http/api-response";

/** Lightweight polling target for the waiting-for-payment page. Safe to hit every 3-5s. */
export const GET: APIRoute = async ({ params }) => {
  try {
    const result = await getOrderStatus(params.reference!);
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
};
