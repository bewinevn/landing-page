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
