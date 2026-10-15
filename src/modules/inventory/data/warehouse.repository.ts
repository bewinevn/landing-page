import { callRpc } from "../../../shared/db/rpc";
import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";
import type { ProductStockRow, WarehouseRow } from "../domain/inventory.types";

export async function listWarehouses(): Promise<WarehouseRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("warehouses").select("*").order("code", { ascending: true });
  if (error) throw new Error(`listWarehouses failed: ${error.message}`);
  return data as WarehouseRow[];
}

/** All product_stock rows — the admin Kho page groups these by product client-side. */
export async function listAllProductStock(): Promise<ProductStockRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("product_stock").select("*");
  if (error) throw new Error(`listAllProductStock failed: ${error.message}`);
  return data as ProductStockRow[];
}

export async function transferStock(
  productId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
): Promise<void> {
  await callRpc<void>("transfer_stock", {
    p_product_id: productId,
    p_from_warehouse_id: fromWarehouseId,
    p_to_warehouse_id: toWarehouseId,
    p_quantity: quantity,
  });
}

export async function restockProduct(productId: string, warehouseId: string, quantity: number): Promise<void> {
  await callRpc<void>("restock_product", {
    p_product_id: productId,
    p_warehouse_id: warehouseId,
    p_quantity: quantity,
  });
}

export async function fulfillOrderFromWarehouse(orderId: string, warehouseId: string): Promise<void> {
  await callRpc<void>("fulfill_order_from_warehouse", {
    p_order_id: orderId,
    p_warehouse_id: warehouseId,
  });
}
