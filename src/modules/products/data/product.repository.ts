import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";
import type { ProductRow } from "../domain/product.types";

export async function findActiveProducts(): Promise<ProductRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`findActiveProducts failed: ${error.message}`);
  return data as ProductRow[];
}

export async function findProductBySlug(slug: string): Promise<ProductRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`findProductBySlug failed: ${error.message}`);
  return (data as ProductRow) ?? null;
}

export async function findProductsByIds(ids: string[]): Promise<ProductRow[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("*").in("id", ids);
  if (error) throw new Error(`findProductsByIds failed: ${error.message}`);
  return data as ProductRow[];
}

/** All products regardless of is_active — for the admin inventory list. */
export async function findAllProducts(): Promise<ProductRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(`findAllProducts failed: ${error.message}`);
  return data as ProductRow[];
}

export interface ProductInventoryPatch {
  stock_quantity?: number;
  is_active?: boolean;
  is_coming_soon?: boolean;
}

export async function updateProductFields(id: string, patch: ProductInventoryPatch): Promise<ProductRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("products").update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(`updateProductFields failed: ${error.message}`);
  return data as ProductRow;
}
