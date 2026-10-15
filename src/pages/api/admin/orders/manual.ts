import type { APIRoute } from "astro";
import { z } from "zod";
import { createOrder } from "../../../../modules/orders";
import { applyIncomingTransaction } from "../../../../modules/payments";
import { ValidationError } from "../../../../shared/errors/app-error";
import { errorResponse, jsonResponse } from "../../../../shared/http/api-response";

const manualOrderSchema = z.object({
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
});

/**
 * Records a sale a salesperson made outside the website (in person, phone,
 * Zalo, ...) so it still reserves real stock and shows up for warehouse
 * fulfillment like any other order. Always booked as channel "offline" and
 * marked paid immediately — the money was already collected off-platform,
 * this only needs to book the order and commit inventory. If the auto
 * mark-paid step fails, the order still exists (pending_payment) and can be
 * marked paid manually from its detail page, same as a COD order.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const input = manualOrderSchema.parse(body);

    const { order } = await createOrder({
      customer: input.customer,
      items: input.items,
      locale: "vn",
      paymentMethod: "offline",
      channel: "offline",
    });

    try {
      await applyIncomingTransaction("manual", {
        providerTransactionId: `manual-${order.reference}-${Date.now()}`,
        amountVnd: order.total_vnd,
        currency: order.currency,
        rawReferenceText: order.reference,
        matchedReference: order.reference,
        occurredAt: new Date(),
        direction: "in",
        raw: { source: "admin_manual_order" },
      });
    } catch (err) {
      console.error("[manual-order] auto mark-paid failed", err);
    }

    return jsonResponse({ orderReference: order.reference, orderId: order.id }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ValidationError(err.issues.map((i) => i.message).join("; ")));
    }
    return errorResponse(err);
  }
};
