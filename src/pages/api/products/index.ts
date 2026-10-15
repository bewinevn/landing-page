import type { APIRoute } from "astro";
import { listProducts, type Locale } from "../../../modules/products";
import { errorResponse, jsonResponse } from "../../../shared/http/api-response";

export const GET: APIRoute = async ({ url }) => {
  try {
    const locale = (url.searchParams.get("locale") === "en" ? "en" : "vn") as Locale;
    const products = await listProducts(locale);
    return jsonResponse({ products });
  } catch (err) {
    return errorResponse(err);
  }
};
