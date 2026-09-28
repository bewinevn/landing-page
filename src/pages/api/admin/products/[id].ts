import type { APIRoute } from "astro";
import { z } from "zod";
import { updateProductInventory } from "../../../../modules/products";
import { errorResponse, jsonResponse } from "../../../../shared/http/api-response";
import { ValidationError } from "../../../../shared/errors/app-error";

const bodySchema = z
  .object({
    stockQuantity: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    isComingSoon: z.boolean().optional(),
  })
  .refine((v) => v.stockQuantity !== undefined || v.isActive !== undefined || v.isComingSoon !== undefined, {
    message: "At least one field is required",
  });

export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const input = bodySchema.parse(body);

    const product = await updateProductInventory(params.id!, {
      stock_quantity: input.stockQuantity,
      is_active: input.isActive,
      is_coming_soon: input.isComingSoon,
    });

    return jsonResponse({ ok: true, product });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ValidationError(err.issues.map((i) => i.message).join("; ")));
    }
    return errorResponse(err);
  }
};
