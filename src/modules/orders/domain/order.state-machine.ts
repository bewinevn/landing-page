import type { OrderStatus } from "./order.types";

/**
 * Valid order-status transitions. `orders.status` is the commerce
 * lifecycle; it's driven either by the customer (checkout, future
 * cancel), the payment RPC (pending_payment -> paid), or the
 * order-expiry sweep (pending_payment -> cancelled). Everything past
 * `paid` (processing/shipped/completed) is a future admin/automation
 * hook, not exercised by any code in this MVP yet, but declared here
 * so the schema and this table don't need to change when it's built.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["processing", "refunded"],
  processing: ["shipped"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
