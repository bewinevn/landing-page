import { getEnv } from "../../../../shared/config/env";
import type {
  CreatePaymentIntentInput,
  ParsedTransaction,
  PaymentIntent,
  PaymentProvider,
  WebhookRequest,
  WebhookVerificationResult,
} from "../payment-provider.interface";

/**
 * Generates real, bank-app-scannable VietQR codes via the free
 * img.vietqr.io image API — no provider account needed for QR
 * generation itself. This provider does NOT automatically detect
 * incoming transfers (there's no free bank webhook feed); for that,
 * use the mock webhook endpoint during development, and swap to the
 * `sepay` provider later for real automatic detection. Swapping
 * providers changes nothing in checkout UI or order/payment logic.
 */
export const vietqrStaticProvider: PaymentProvider = {
  name: "vietqr_static",

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const env = getEnv();
    const qrCodeUrl =
      `https://img.vietqr.io/image/${env.BEWINE_BANK_BIN}-${env.BEWINE_BANK_ACCOUNT_NUMBER}-${env.VIETQR_TEMPLATE}.png` +
      `?amount=${input.amountVnd}` +
      `&addInfo=${encodeURIComponent(input.orderReference)}` +
      `&accountName=${encodeURIComponent(env.BEWINE_BANK_ACCOUNT_HOLDER)}`;

    return {
      provider: "vietqr_static",
      reference: input.orderReference,
      amountExpectedVnd: input.amountVnd,
      bankAccountNumber: env.BEWINE_BANK_ACCOUNT_NUMBER,
      bankAccountHolder: env.BEWINE_BANK_ACCOUNT_HOLDER,
      bankName: env.BEWINE_BANK_NAME,
      qrCodeUrl,
      expiresAt: input.expiresAt,
    };
  },

  verifyWebhookSignature(_request: WebhookRequest): WebhookVerificationResult {
    // This provider has no real webhook feed; only the dev-only mock
    // webhook route calls into payment logic directly (bypassing this
    // provider entirely). If ever hit, reject — there's nothing to verify.
    return { isValid: false, reason: "vietqr_static has no live webhook feed; use /api/webhooks/mock in dev" };
  },

  parseWebhookPayload(_rawBody: string): ParsedTransaction[] {
    return [];
  },

  buildWebhookAckResponse() {
    return { status: 200, body: { ok: true } };
  },
};
