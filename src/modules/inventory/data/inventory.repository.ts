import { callRpc } from "../../../shared/db/rpc";

/** Atomic conditional reservation. Returns false if not enough stock was available. */
export async function reserveStock(productId: string, quantity: number): Promise<boolean> {
  return callRpc<boolean>("reserve_product_stock", { p_product_id: productId, p_quantity: quantity });
}

/** Releases a reservation without touching physical stock (expiry/cancellation). */
export async function releaseStock(productId: string, quantity: number): Promise<void> {
  await callRpc<void>("release_product_stock", { p_product_id: productId, p_quantity: quantity });
}
