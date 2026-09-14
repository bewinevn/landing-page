import { ValidationError } from "../../../shared/errors/app-error";
import * as warehouseRepository from "../data/warehouse.repository";
import type { ProductStockRow, WarehouseRow } from "./inventory.types";

export async function listWarehouses(): Promise<WarehouseRow[]> {
  return warehouseRepository.listWarehouses();
}

export async function listAllProductStock(): Promise<ProductStockRow[]> {
  return warehouseRepository.listAllProductStock();
}

/** Translates the plpgsql RAISE EXCEPTION strings from the RPCs into admin-facing Vietnamese. */
function translateStockError(err: unknown): never {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("insufficient_stock_at_source")) {
    throw new ValidationError("Kho nguồn không đủ số lượng để chuyển.");
  }
  if (message.includes("from_and_to_warehouse_must_differ")) {
    throw new ValidationError("Kho nguồn và kho đích phải khác nhau.");
  }
  if (message.includes("quantity_must_be_positive")) {
    throw new ValidationError("Số lượng phải lớn hơn 0.");
  }
  if (message.includes("insufficient_warehouse_stock")) {
    throw new ValidationError("Kho được chọn không đủ hàng cho đơn này. Hãy chọn kho khác hoặc chuyển kho trước.");
  }
  if (message.includes("order_not_paid")) {
    throw new ValidationError("Chỉ có thể xuất kho cho đơn đã thanh toán.");
  }
  throw err;
}

export async function transferStock(
  productId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
): Promise<void> {
  try {
    await warehouseRepository.transferStock(productId, fromWarehouseId, toWarehouseId, quantity);
  } catch (err) {
    translateStockError(err);
  }
}

export async function restockProduct(productId: string, warehouseId: string, quantity: number): Promise<void> {
  try {
    await warehouseRepository.restockProduct(productId, warehouseId, quantity);
  } catch (err) {
    translateStockError(err);
  }
}

export async function fulfillOrderFromWarehouse(orderId: string, warehouseId: string): Promise<void> {
  try {
    await warehouseRepository.fulfillOrderFromWarehouse(orderId, warehouseId);
  } catch (err) {
    translateStockError(err);
  }
}
