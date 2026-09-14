import type { APIRoute } from "astro";
import { z } from "zod";
import { fulfillOrder } from "../../../../../modules/orders";
import { errorResponse, jsonResponse } from "../../../../../shared/http/api-response";
import { ValidationError } from "../../../../../shared/errors/app-error";

const bodySchema = z.object({
  warehouseId: z.string().uuid(),
});

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const { warehouseId } = bodySchema.parse(body);
    const order = await fulfillOrder(params.reference!, warehouseId);
    return jsonResponse({ ok: true, status: order.status });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ValidationError(err.issues.map((i) => i.message).join("; ")));
    }
    return errorResponse(err);
  }
};
