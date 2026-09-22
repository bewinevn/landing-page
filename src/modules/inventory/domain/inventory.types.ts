export interface ReservationRequest {
  productId: string;
  quantity: number;
}

export interface WarehouseRow {
  id: string;
  code: string;
  name: string;
}

export interface ProductStockRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  stock_quantity: number;
}
