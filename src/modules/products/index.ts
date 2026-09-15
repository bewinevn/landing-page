export {
  listProducts,
  getProductBySlug,
  getProductRowsByIds,
  listProductsForAdmin,
  updateProductInventory,
} from "./domain/product.service";
export type { ProductInventoryPatch } from "./data/product.repository";
export type { Product, ProductRow, Locale } from "./domain/product.types";
