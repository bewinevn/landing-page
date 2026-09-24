import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";
import type { PaymentRow } from "../domain/payment.types";

export async function insert(row: Omit<PaymentRow, "id" | "status">): Promise<PaymentRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("payments").insert(row).select("*").single();
  if (error) throw new Error(`insert payment failed: ${error.message}`);
  return data as PaymentRow;
}

export async function findByReference(reference: string): Promise<PaymentRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (error) throw new Error(`findByReference failed: ${error.message}`);
  return (data as PaymentRow) ?? null;
}

/** Batched lookup for the admin order list, to avoid one payments query per order row. */
export async function findByOrderIds(orderIds: string[]): Promise<PaymentRow[]> {
  if (orderIds.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("payments").select("*").in("order_id", orderIds);
  if (error) throw new Error(`findByOrderIds failed: ${error.message}`);
  return (data as PaymentRow[]) ?? [];
}
