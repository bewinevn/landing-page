import { findOrCreateByPhone } from "../../customers";
import { releaseAll, reserveAll, type ReservationRequest } from "../../inventory";
import { createPaymentForOrder, toPaymentView, type PaymentView } from "../../payments";
import { getProductRowsByIds, type ProductRow } from "../../products";
import { getEnv } from "../../../shared/config/env";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error";
import { generateOrderReference } from "../../../shared/utils/reference";
import * as orderRepository from "../data/order.repository";
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
    const unitPriceVnd = effectivePrice(product);
    return {
      product,
      quantity: item.quantity,
      unitPriceVnd,
      lineTotalVnd: unitPriceVnd * item.quantity,
    };
  });

  const reservations: ReservationRequest[] = lineItems.map((li) => ({
    productId: li.product.id,
    quantity: li.quantity,
  }));

  await reserveAll(reservations); // throws ConflictError and rolls back partial reservations on failure

  try {
    const customer = await findOrCreateByPhone(input.customer);

    const reference = await generateUniqueReference();
    const env = getEnv();
    const expiresAt = new Date(Date.now() + env.ORDER_PAYMENT_WINDOW_MINUTES * 60_000);

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
      expires_at: expiresAt.toISOString(),
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

    const paymentRow = await createPaymentForOrder({
      orderId: order.id,
      orderReference: order.reference,
      amountVnd: order.total_vnd,
      expiresAt,
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
