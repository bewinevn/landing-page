export type Locale = "vn" | "en";

export interface ProductRow {
  id: string;
  slug: string;
  abbreviation: string;
  name_vn: string;
  name_en: string;
  type_vn: string;
  type_en: string;
  description_vn: string;
  description_en: string;
  alcohol_content: number;
  price_vnd: number;
  image_url: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  is_active: boolean;
  is_coming_soon: boolean;
  is_promo: boolean;
  promo_label_vn: string | null;
  promo_label_en: string | null;
  promo_price_vnd: number | null;
}

/** Localized, presentation-ready product shape returned by the API and used by pages. */
export interface Product {
  id: string;
  slug: string;
  abbreviation: string;
  name: string;
  type: string;
  description: string;
  alcoholContent: number;
  priceVnd: number;
  effectivePriceVnd: number; // promo_price_vnd when is_promo, else priceVnd
  imageUrl: string | null;
  availableQty: number; // stock_quantity - reserved_quantity
  isActive: boolean;
  isComingSoon: boolean;
  isPromo: boolean;
  promoLabel: string | null;
}

export function toProduct(row: ProductRow, locale: Locale): Product {
  const effectivePriceVnd = row.is_promo && row.promo_price_vnd != null ? row.promo_price_vnd : row.price_vnd;
  return {
    id: row.id,
    slug: row.slug,
    abbreviation: row.abbreviation,
    name: locale === "vn" ? row.name_vn : row.name_en,
    type: locale === "vn" ? row.type_vn : row.type_en,
    description: locale === "vn" ? row.description_vn : row.description_en,
    alcoholContent: row.alcohol_content,
    priceVnd: row.price_vnd,
    effectivePriceVnd,
    imageUrl: row.image_url,
    availableQty: Math.max(0, row.stock_quantity - row.reserved_quantity),
    isActive: row.is_active,
    isComingSoon: row.is_coming_soon,
    isPromo: row.is_promo,
    promoLabel: row.is_promo ? (locale === "vn" ? row.promo_label_vn : row.promo_label_en) : null,
  };
}
