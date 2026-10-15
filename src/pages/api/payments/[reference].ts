import type { APIRoute } from "astro";
import { getPaymentByReference } from "../../../modules/payments";
import { errorResponse, jsonResponse } from "../../../shared/http/api-response";

export const GET: APIRoute = async ({ params }) => {
  try {
    const payment = await getPaymentByReference(params.reference!);
    return jsonResponse({ payment });
  } catch (err) {
    return errorResponse(err);
  }
};
