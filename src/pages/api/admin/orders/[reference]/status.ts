import type { APIRoute } from "astro";
import { z } from "zod";
import { advanceOrderStatus } from "../../../../../modules/orders";
import { errorResponse, jsonResponse } from "../../../../../shared/http/api-response";
import { ValidationError } from "../../../../../shared/errors/app-error";

// "paid" and "processing" are deliberately excluded: reaching "paid" must
// go through mark-paid (payments.status + inventory side effects), and
// "processing" must go through fulfill (warehouse stock deduction) — a
// plain status write here would silently skip those.
const bodySchema = z.object({
  status: z.enum(["shipped", "completed", "cancelled", "refunded"]),
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
