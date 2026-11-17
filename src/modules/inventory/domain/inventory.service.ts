import { ConflictError } from "../../../shared/errors/app-error";
import * as inventoryRepository from "../data/inventory.repository";
import type { ReservationRequest } from "./inventory.types";

/**
 * Reserves stock for every line item. Each individual reservation is
 * atomic at the DB level (see reserve_product_stock), but reserving
 * N items is not itself one transaction — if item 3 of 5 fails, this
 * rolls back the ones that already succeeded before throwing, so a
 * failed checkout never leaves partial reservations behind.
 */
export async function reserveAll(items: ReservationRequest[]): Promise<void> {
  const reserved: ReservationRequest[] = [];
  for (const item of items) {
    const ok = await inventoryRepository.reserveStock(item.productId, item.quantity);
    if (!ok) {
      await releaseAll(reserved);
      throw new ConflictError(`Insufficient stock for product ${item.productId}`);
    }
    reserved.push(item);
  }
}

export async function releaseAll(items: ReservationRequest[]): Promise<void> {
  await Promise.all(items.map((item) => inventoryRepository.releaseStock(item.productId, item.quantity)));
}
