import type { APIRoute } from "astro";
import { z } from "zod";
import { writeOffGiftStock } from "../../../../modules/inventory";
import { errorResponse, jsonResponse } from "../../../../shared/http/api-response";
import { ValidationError } from "../../../../shared/errors/app-error";

const bodySchema = z.object({
  productId: z.string().uuid(),
  fromWarehouseId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const input = bodySchema.parse(body);
    await writeOffGiftStock(input.productId, input.fromWarehouseId, input.quantity);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ValidationError(err.issues.map((i) => i.message).join("; ")));
    }
    return errorResponse(err);
  }
};
