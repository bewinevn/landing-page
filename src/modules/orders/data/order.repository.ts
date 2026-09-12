import { callRpc } from "../../../shared/db/rpc";
import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";
import type { OrderItemRow, OrderRow, OrderStatus } from "../domain/order.types";

export async function insertOrder(row: Omit<OrderRow, "id" | "created_at" | "status">): Promise<OrderRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("orders").insert(row).select("*").single();
  if (error) throw new Error(`insertOrder failed: ${error.message}`);
  return data as OrderRow;
}

export async function insertOrderItems(rows: Omit<OrderItemRow, "id">[]): Promise<OrderItemRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("order_items").insert(rows).select("*");
  if (error) throw new Error(`insertOrderItems failed: ${error.message}`);
  return data as OrderItemRow[];
}

export async function findByReference(reference: string): Promise<OrderRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select("*").eq("reference", reference).maybeSingle();
  if (error) throw new Error(`findByReference failed: ${error.message}`);
  return (data as OrderRow) ?? null;
}

export async function findItemsByOrderId(orderId: string): Promise<OrderItemRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  if (error) throw new Error(`findItemsByOrderId failed: ${error.message}`);
  return data as OrderItemRow[];
}

export async function getStatus(reference: string): Promise<{ status: OrderStatus; paidAt: string | null } | null> {
  const supabase = getSupabaseServerClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("status")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error(`getStatus failed: ${error.message}`);
  if (!order) return null;

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("paid_at")
    .eq("reference", reference)
    .maybeSingle();
  if (paymentError) throw new Error(`getStatus (payment) failed: ${paymentError.message}`);

  return { status: order.status as OrderStatus, paidAt: payment?.paid_at ?? null };
}

/** Runs the DB-side expiry sweep (see migration 0001). */
export async function runExpireStaleOrders(): Promise<number> {
  return callRpc<number>("expire_stale_orders", {});
}
