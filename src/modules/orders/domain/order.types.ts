import type { Locale } from "../../products";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refunded";

export interface OrderRow {
  id: string;
  reference: string;
  customer_id: string;
  status: OrderStatus;
  cancelled_reason: string | null;
  subtotal_vnd: number;
  total_vnd: number;
  currency: string;
  delivery_full_name: string;
  delivery_phone: string;
  delivery_address_line: string;
  delivery_city: string;
  delivery_note: string | null;
  locale: Locale;
  expires_at: string | null;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  unit_price_vnd: number;
  quantity: number;
  line_total_vnd: number;
}

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  /** Promo gift can — server forces unit price to 0 and skips stock reservation. */
  isGift?: boolean;
  /**
   * Forces this line's per-can price instead of the product's own listed
   * price — used for fixed-price bundles. Stock is still reserved
   * normally (unlike isGift).
   */
  unitPriceOverrideVnd?: number;
}

export interface CheckoutInput {
  customer: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    note?: string;
  };
  items: CheckoutItemInput[];
  locale: Locale;
  paymentMethod: "vietqr" | "cod";
}
