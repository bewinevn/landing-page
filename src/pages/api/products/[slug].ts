import type { APIRoute } from "astro";
import { getProductBySlug, type Locale } from "../../../modules/products";
import { errorResponse, jsonResponse } from "../../../shared/http/api-response";

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const locale = (url.searchParams.get("locale") === "en" ? "en" : "vn") as Locale;
    const product = await getProductBySlug(params.slug!, locale);
    return jsonResponse({ product });
  } catch (err) {
    return errorResponse(err);
  }
};
