import type { APIRoute } from "astro";
import { z } from "zod";
import { handleMockWebhook } from "../../../modules/webhooks";
import { UnauthorizedError, ValidationError } from "../../../shared/errors/app-error";
import { errorResponse, jsonResponse } from "../../../shared/http/api-response";

const mockSchema = z.object({
  reference: z.string().min(1),
  amountVnd: z.number().int().nonnegative(),
});

/**
 * DEV-ONLY: simulates an incoming bank transfer so checkout can be
 * tested end-to-end without a real bank/provider. Gated to
 * `import.meta.env.DEV` — this must never be reachable on the
 * production build, since anyone could call it to mark an arbitrary
 * order as PAID without actually paying.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return errorResponse(new UnauthorizedError("Mock webhook is disabled outside development"));
  }

  try {
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });
    const input = mockSchema.parse(body);

    const result = await handleMockWebhook(input);
    return jsonResponse(result.body, result.status);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ValidationError(err.issues.map((i) => i.message).join("; ")));
    }
    return errorResponse(err);
  }
};
