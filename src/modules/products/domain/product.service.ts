import { NotFoundError, ValidationError } from "../../../shared/errors/app-error";
import * as productRepository from "../data/product.repository";
import type { ProductInventoryPatch } from "../data/product.repository";
import { toProduct, type Locale, type Product, type ProductRow } from "./product.types";

// Petite Sirah is the only wine actually purchasable today and should
// always lead the catalog, wherever products are listed.
const FEATURED_SLUG = "petite-sirah";

export async function listProducts(locale: Locale): Promise<Product[]> {
  const rows = await productRepository.findActiveProducts();
  const products = rows.map((row) => toProduct(row, locale));
  return products.sort((a, b) => {
    if (a.slug === FEATURED_SLUG) return -1;
    if (b.slug === FEATURED_SLUG) return 1;
    return 0;
  });
}

export async function getProductBySlug(slug: string, locale: Locale): Promise<Product> {
  const row = await productRepository.findProductBySlug(slug);
  if (!row || !row.is_active) throw new NotFoundError(`Product "${slug}" not found`);
  return toProduct(row, locale);
}

/**
 * Raw (non-localized) product rows for internal use by other modules
 * (e.g. Orders re-reading authoritative price/stock at checkout).
 * Not exposed over HTTP.
 */
export async function getProductRowsByIds(ids: string[]): Promise<ProductRow[]> {
  return productRepository.findProductsByIds(ids);
}

/** All products (active or not) for the admin inventory screen. */
export async function listProductsForAdmin(): Promise<ProductRow[]> {
  return productRepository.findAllProducts();
}

export async function updateProductInventory(id: string, patch: ProductInventoryPatch): Promise<ProductRow> {
  try {
    return await productRepository.updateProductFields(id, patch);
  } catch (err) {
    // Surfaces the reserved<=stock DB constraint (a product can't be
    // restocked below what pending orders already hold) as a clean
    // admin-facing message instead of a raw Postgres error string.
    if (err instanceof Error && err.message.includes("products_reserved_lte_stock")) {
      throw new ValidationError("Số lượng tồn kho không thể thấp hơn số lượng đang được giữ cho đơn chờ thanh toán.");
    }
    throw err;
  }
}
