import type { APIRoute } from "astro";
import { listOrdersForAdmin, type OrderStatus } from "../../../../modules/orders";
import { getPaymentsByOrderIds } from "../../../../modules/payments";
import { errorResponse, jsonResponse } from "../../../../shared/http/api-response";

const VALID_STATUSES = new Set<OrderStatus>([
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
]);

export const GET: APIRoute = async ({ url }) => {
  try {
    const statusParam = url.searchParams.get("status") ?? undefined;
    const status = statusParam && VALID_STATUSES.has(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;
    const search = url.searchParams.get("q") ?? undefined;
    const offset = Number(url.searchParams.get("offset") ?? "0") || 0;

    const { orders, total } = await listOrdersForAdmin({ status, search, offset });
    const paymentsByOrderId = await getPaymentsByOrderIds(orders.map((o) => o.id));

    const items = orders.map((order) => ({
      reference: order.reference,
      status: order.status,
      totalVnd: order.total_vnd,
      deliveryFullName: order.delivery_full_name,
      deliveryPhone: order.delivery_phone,
      createdAt: order.created_at,
      paymentProvider: paymentsByOrderId.get(order.id)?.provider ?? null,
      paymentStatus: paymentsByOrderId.get(order.id)?.status ?? null,
    }));

    return jsonResponse({ items, total });
  } catch (err) {
    return errorResponse(err);
  }
};
