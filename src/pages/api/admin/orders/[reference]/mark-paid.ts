import type { APIRoute } from "astro";
import { getOrderDetail } from "../../../../../modules/orders";
import { applyIncomingTransaction } from "../../../../../modules/payments";
import { errorResponse, jsonResponse } from "../../../../../shared/http/api-response";
import { ValidationError } from "../../../../../shared/errors/app-error";

/**
 * Manual payment reconciliation: used for COD orders (no bank transfer to
 * detect) and for a real bank transfer received before SePay/webhook
 * auto-detection is wired up. Delegates to the same atomic
 * apply_incoming_transaction RPC the real webhook uses, so idempotency
 * and the paid/mismatch/inventory-commit logic are identical — this
 * only supplies a synthetic transaction with the order's own
 * server-read total (never a client-supplied amount).
 */
export const POST: APIRoute = async ({ params }) => {
  try {
    const reference = params.reference!;
    const { order } = await getOrderDetail(reference);
    if (order.status !== "pending_payment") {
      throw new ValidationError(`Order "${reference}" is not pending payment (status: ${order.status})`);
    }

    const result = await applyIncomingTransaction("manual", {
      providerTransactionId: `manual-${reference}-${Date.now()}`,
      amountVnd: order.total_vnd,
      currency: order.currency,
      rawReferenceText: reference,
      matchedReference: reference,
      occurredAt: new Date(),
      direction: "in",
      raw: { source: "admin_mark_paid" },
    });

    if (result.resultStatus !== "paid") {
      throw new ValidationError(`Could not mark order as paid (result: ${result.resultStatus})`);
    }

    return jsonResponse({ ok: true, resultStatus: result.resultStatus });
  } catch (err) {
    return errorResponse(err);
  }
};
