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

export interface OrderListFilter {
  status?: OrderStatus;
  search?: string;
  limit: number;
  offset: number;
}

/** Admin order list. delivery_full_name/delivery_phone are already denormalized on orders, so no customer join is needed. */
export async function findOrders(filter: OrderListFilter): Promise<{ orders: OrderRow[]; total: number }> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.search) {
    // .or() takes a raw PostgREST filter string (unlike .eq()/.ilike()), so
    // strip the characters that are syntactically meaningful to it before
    // interpolating user input.
    const term = filter.search.trim().replace(/[,()]/g, "");
    if (term) {
      query = query.or(`reference.ilike.%${term}%,delivery_phone.ilike.%${term}%`);
    }
  }

  const { data, error, count } = await query.range(filter.offset, filter.offset + filter.limit - 1);
  if (error) throw new Error(`findOrders failed: ${error.message}`);
  return { orders: (data as OrderRow[]) ?? [], total: count ?? 0 };
}

export async function voidManualOrder(orderId: string): Promise<void> {
  await callRpc("void_manual_order", { p_order_id: orderId });
}

export async function updateStatus(orderId: string, status: OrderStatus): Promise<OrderRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw new Error(`updateStatus failed: ${error.message}`);
  return data as OrderRow;
}

export interface SalesOrderRow {
  id: string;
  total_vnd: number;
  subtotal_vnd: number;
}

/** Order volume/revenue is small enough at this stage to aggregate in-process rather than via SQL. */
export async function findOrdersByStatuses(statuses: OrderStatus[]): Promise<SalesOrderRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select("id, total_vnd, subtotal_vnd").in("status", statuses);
  if (error) throw new Error(`findOrdersByStatuses failed: ${error.message}`);
  return data as SalesOrderRow[];
}

export async function findAllOrderStatuses(): Promise<OrderStatus[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select("status");
  if (error) throw new Error(`findAllOrderStatuses failed: ${error.message}`);
  return (data as { status: OrderStatus }[]).map((r) => r.status);
}

export async function findItemsByOrderIds(orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("order_items").select("*").in("order_id", orderIds);
  if (error) throw new Error(`findItemsByOrderIds failed: ${error.message}`);
  return data as OrderItemRow[];
}
