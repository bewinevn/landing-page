import { findOrCreateByPhone } from "../../customers";
import { fulfillOrderFromWarehouse, releaseAll, reserveAll, type ReservationRequest } from "../../inventory";
import { createCodPaymentForOrder, createPaymentForOrder, toPaymentView, type PaymentView } from "../../payments";
import { getProductRowsByIds, type ProductRow } from "../../products";
import { getEnv } from "../../../shared/config/env";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error";
import { generateOrderReference } from "../../../shared/utils/reference";
import * as orderRepository from "../data/order.repository";
import { canTransition } from "./order.state-machine";
import type { CheckoutInput, OrderItemRow, OrderRow, OrderStatus } from "./order.types";

export interface CheckoutResult {
  order: OrderRow;
  items: OrderItemRow[];
  payment: PaymentView;
}

/**
 * Orchestrates the whole checkout: re-validates items against the DB
 * (never trusting client-submitted prices), reserves stock, upserts
 * the customer, creates the order + order_items, and creates the
 * payment intent (real VietQR). Any failure after stock is reserved
 * releases that reservation before re-throwing, so a failed checkout
 * never leaves phantom holds on inventory.
 */
export async function createOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (input.items.length === 0) {
    throw new ValidationError("Cart is empty");
  }

  const productRows = await getProductRowsByIds(input.items.map((i) => i.productId));
  const productsById = new Map(productRows.map((p) => [p.id, p]));

  const lineItems = input.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product || !product.is_active) {
      throw new NotFoundError(`Product ${item.productId} is not available`);
    }
    if (item.quantity <= 0) {
      throw new ValidationError(`Invalid quantity for product ${item.productId}`);
    }
    // Gift cans are priced at 0đ regardless of the product's real price.
    const unitPriceVnd = item.isGift ? 0 : effectivePrice(product);
    return {
      product,
      quantity: item.quantity,
      unitPriceVnd,
      lineTotalVnd: unitPriceVnd * item.quantity,
      isGift: item.isGift ?? false,
    };
  });

  // Gift lines aren't reserved against tracked stock (some gift SKUs, e.g.
  // upcoming wines, have zero recorded stock) — only paid lines hold inventory.
  const reservations: ReservationRequest[] = lineItems
    .filter((li) => !li.isGift)
    .map((li) => ({
      productId: li.product.id,
      quantity: li.quantity,
    }));

  await reserveAll(reservations); // throws ConflictError and rolls back partial reservations on failure

  try {
    const customer = await findOrCreateByPhone(input.customer);

    const reference = await generateUniqueReference();
    const env = getEnv();
    // COD isn't waiting on a bank transfer, so it gets no expiry — the
    // stale-order sweep only cancels orders with a non-null expires_at.
    const expiresAt =
      input.paymentMethod === "cod" ? null : new Date(Date.now() + env.ORDER_PAYMENT_WINDOW_MINUTES * 60_000);

    const subtotalVnd = lineItems.reduce((sum, li) => sum + li.lineTotalVnd, 0);

    const order = await orderRepository.insertOrder({
      reference,
      customer_id: customer.id,
      cancelled_reason: null,
      subtotal_vnd: subtotalVnd,
      total_vnd: subtotalVnd, // no shipping/tax modeled in this MVP
      currency: "VND",
      delivery_full_name: input.customer.fullName,
      delivery_phone: input.customer.phone,
      delivery_address_line: input.customer.addressLine,
      delivery_city: input.customer.city,
      delivery_note: input.customer.note ?? null,
      locale: input.locale,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    });

    const items = await orderRepository.insertOrderItems(
      lineItems.map((li) => ({
        order_id: order.id,
        product_id: li.product.id,
        product_name_snapshot: input.locale === "vn" ? li.product.name_vn : li.product.name_en,
        unit_price_vnd: li.unitPriceVnd,
        quantity: li.quantity,
        line_total_vnd: li.lineTotalVnd,
      })),
    );

    const paymentRow =
      input.paymentMethod === "cod"
        ? await createCodPaymentForOrder({
            orderId: order.id,
            orderReference: order.reference,
            amountVnd: order.total_vnd,
          })
        : await createPaymentForOrder({
            orderId: order.id,
            orderReference: order.reference,
            amountVnd: order.total_vnd,
            expiresAt: expiresAt!,
          });

    return { order, items, payment: toPaymentView(paymentRow) };
  } catch (err) {
    await releaseAll(reservations);
    throw err;
  }
}

function effectivePrice(product: ProductRow): number {
  return product.is_promo && product.promo_price_vnd != null ? product.promo_price_vnd : product.price_vnd;
}

async function generateUniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateOrderReference();
    const existing = await orderRepository.findByReference(candidate);
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique order reference after 5 attempts");
}

export interface OrderDetail {
  order: OrderRow;
  items: OrderItemRow[];
  payment: PaymentView | null;
}

export async function getOrderDetail(reference: string): Promise<OrderDetail> {
  const order = await orderRepository.findByReference(reference);
  if (!order) throw new NotFoundError(`Order "${reference}" not found`);
  const items = await orderRepository.findItemsByOrderId(order.id);
  return { order, items, payment: null }; // payment fetched separately by callers that need it (see payments module)
}

export async function getOrderStatus(reference: string): Promise<{ orderStatus: OrderStatus; paidAt: string | null }> {
  const result = await orderRepository.getStatus(reference);
  if (!result) throw new NotFoundError(`Order "${reference}" not found`);
  return { orderStatus: result.status, paidAt: result.paidAt };
}

/** Cancels stale pending_payment orders and releases their reserved stock. Called by the Netlify Scheduled Function. */
export async function expireStaleOrders(): Promise<{ expiredCount: number }> {
  const expiredCount = await orderRepository.runExpireStaleOrders();
  return { expiredCount };
}

export interface AdminOrderListFilter {
  status?: OrderStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listOrdersForAdmin(
  filter: AdminOrderListFilter,
): Promise<{ orders: OrderRow[]; total: number }> {
  return orderRepository.findOrders({
    status: filter.status,
    search: filter.search,
    limit: filter.limit ?? 50,
    offset: filter.offset ?? 0,
  });
}

/** Admin-only fulfillment status change (shipped/completed) — payment status is untouched. */
export async function advanceOrderStatus(reference: string, toStatus: OrderStatus): Promise<OrderRow> {
  const order = await orderRepository.findByReference(reference);
  if (!order) throw new NotFoundError(`Order "${reference}" not found`);
  if (!canTransition(order.status, toStatus)) {
    throw new ValidationError(`Cannot move order from "${order.status}" to "${toStatus}"`);
  }
  return orderRepository.updateStatus(order.id, toStatus);
}

/**
 * Packing-time warehouse allocation: the paid -> processing transition.
 * Deducts the chosen warehouse's physical stock for every line item
 * (all-or-nothing, via fulfill_order_from_warehouse) and records which
 * warehouse serviced the order. products.stock_quantity (the grand
 * total) is untouched here — it was already committed at payment time.
 */
export async function fulfillOrder(reference: string, warehouseId: string): Promise<OrderRow> {
  const order = await orderRepository.findByReference(reference);
  if (!order) throw new NotFoundError(`Order "${reference}" not found`);
  if (order.status !== "paid") {
    throw new ValidationError(`Order "${reference}" is not paid (status: ${order.status})`);
  }
  await fulfillOrderFromWarehouse(order.id, warehouseId);
  const updated = await orderRepository.findByReference(reference);
  return updated!;
}

// Orders in these statuses represent money actually collected/committed —
// pending_payment (nothing received yet) and cancelled/refunded are excluded.
const REVENUE_STATUSES: OrderStatus[] = ["paid", "processing", "shipped", "completed"];
const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
];

export interface SalesSummary {
  totalRevenueVnd: number;
  totalOrders: number;
  totalCansSold: number;
  byProduct: { name: string; quantity: number; revenueVnd: number }[];
  statusCounts: Record<OrderStatus, number>;
}

export async function getSalesSummary(): Promise<SalesSummary> {
  const [revenueOrders, allStatuses] = await Promise.all([
    orderRepository.findOrdersByStatuses(REVENUE_STATUSES),
    orderRepository.findAllOrderStatuses(),
  ]);
  const items = await orderRepository.findItemsByOrderIds(revenueOrders.map((o) => o.id));

  const byProductMap = new Map<string, { quantity: number; revenueVnd: number }>();
  for (const item of items) {
    const entry = byProductMap.get(item.product_name_snapshot) ?? { quantity: 0, revenueVnd: 0 };
    entry.quantity += item.quantity;
    entry.revenueVnd += item.line_total_vnd;
    byProductMap.set(item.product_name_snapshot, entry);
  }

  const statusCounts = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const status of allStatuses) statusCounts[status] += 1;

  return {
    totalRevenueVnd: revenueOrders.reduce((sum, o) => sum + o.total_vnd, 0),
    totalOrders: revenueOrders.length,
    totalCansSold: items.reduce((sum, i) => sum + i.quantity, 0),
    byProduct: Array.from(byProductMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.quantity - a.quantity),
    statusCounts,
  };
}
