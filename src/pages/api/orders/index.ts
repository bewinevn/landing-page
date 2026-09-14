import type { APIRoute } from "astro";
import { z } from "zod";
import { createOrder } from "../../../modules/orders";
import { ValidationError } from "../../../shared/errors/app-error";
import { errorResponse, jsonResponse } from "../../../shared/http/api-response";

const checkoutSchema = z.object({
  customer: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(8),
    addressLine: z.string().min(1),
    city: z.string().min(1),
    note: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  locale: z.enum(["vn", "en"]).default("vn"),
  paymentMethod: z.enum(["vietqr", "cod"]).default("vietqr"),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const input = checkoutSchema.parse(body);

    const result = await createOrder(input);

    return jsonResponse(
      {
        orderReference: result.order.reference,
        orderId: result.order.id,
        totalVnd: result.order.total_vnd,
        expiresAt: result.order.expires_at,
        payment: result.payment,
      },
      201,
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ValidationError(err.issues.map((i) => i.message).join("; ")));
    }
    return errorResponse(err);
  }
};
