import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";
import type { CustomerRow } from "../domain/customer.types";

export async function findByPhone(phone: string): Promise<CustomerRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("*").eq("phone", phone).maybeSingle();
  if (error) throw new Error(`findByPhone failed: ${error.message}`);
  return (data as CustomerRow) ?? null;
}

export async function insert(row: Omit<CustomerRow, "id">): Promise<CustomerRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("customers").insert(row).select("*").single();
  if (error) throw new Error(`insert customer failed: ${error.message}`);
  return data as CustomerRow;
}

export async function update(id: string, patch: Partial<Omit<CustomerRow, "id">>): Promise<CustomerRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("customers").update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(`update customer failed: ${error.message}`);
  return data as CustomerRow;
}

/** Order history for a customer, most recent first (used for a future account/CRM view). */
export async function findOrderHistory(customerId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, reference, status, total_vnd, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`findOrderHistory failed: ${error.message}`);
  return data;
}
