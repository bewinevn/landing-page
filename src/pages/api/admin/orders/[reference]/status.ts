import type { APIRoute } from "astro";
import { z } from "zod";
import { advanceOrderStatus } from "../../../../../modules/orders";
import { errorResponse, jsonResponse } from "../../../../../shared/http/api-response";
import { ValidationError } from "../../../../../shared/errors/app-error";

const bodySchema = z.object({
  status: z.enum(["processing", "shipped", "completed", "cancelled", "refunded"]),
});

export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const { status } = bodySchema.parse(body);

    const order = await advanceOrderStatus(params.reference!, status);
    return jsonResponse({ ok: true, status: order.status });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ValidationError(err.issues.map((i) => i.message).join("; ")));
    }
    return errorResponse(err);
  }
};
