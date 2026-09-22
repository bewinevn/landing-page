export interface ReservationRequest {
  productId: string;
  quantity: number;
}

export interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  /** True for the write-off bucket that records stock already given away — see write_off_gift_stock. */
  is_gift_bucket: boolean;
}

export interface ProductStockRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  stock_quantity: number;
}
