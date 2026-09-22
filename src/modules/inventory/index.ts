export { reserveAll, releaseAll } from "./domain/inventory.service";
export {
  listWarehouses,
  listAllProductStock,
  transferStock,
  restockProduct,
  fulfillOrderFromWarehouse,
  writeOffGiftStock,
} from "./domain/warehouse.service";
export type { ReservationRequest, WarehouseRow, ProductStockRow } from "./domain/inventory.types";
