import { NotFoundError } from "../../../shared/errors/app-error";
import * as productRepository from "../data/product.repository";
import { toProduct, type Locale, type Product, type ProductRow } from "./product.types";

export async function listProducts(locale: Locale): Promise<Product[]> {
  const rows = await productRepository.findActiveProducts();
  return rows.map((row) => toProduct(row, locale));
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
