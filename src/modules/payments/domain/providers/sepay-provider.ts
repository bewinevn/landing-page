import type {
  CreatePaymentIntentInput,
  ParsedTransaction,
  PaymentIntent,
  PaymentProvider,
  WebhookRequest,
  WebhookVerificationResult,
} from "../payment-provider.interface";

/**
 * NOT IMPLEMENTED — shape only, per the approved plan (real
 * SePay/bank integration is explicitly out of scope for this MVP).
 *
 * When wiring this up for real:
 * - createPaymentIntent: call SePay's VietQR generation endpoint
 *   (or reuse vietqrStaticProvider's QR construction — SePay accounts
 *   also expose a compatible bank account, so the QR itself doesn't
 *   necessarily need to change, only the detection side below does).
 * - verifyWebhookSignature: validate SePay's API-key/HMAC header per
 *   their webhook spec.
 * - parseWebhookPayload: map SePay's payload fields (transactionId,
 *   transferAmount, content, accountNumber, transactionDate) into
 *   ParsedTransaction[], using extractOrderReference() on `content`.
 *
 * Selecting this provider (PAYMENT_PROVIDER=sepay) requires no
 * changes to checkout UI, order.service, or the webhook route —
 * that's the point of the PaymentProvider abstraction.
 */
export const sepayProvider: PaymentProvider = {
  name: "sepay",

  async createPaymentIntent(_input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    throw new Error("sepay provider is not implemented yet — set PAYMENT_PROVIDER=vietqr_static");
  },

  verifyWebhookSignature(_request: WebhookRequest): WebhookVerificationResult {
    return { isValid: false, reason: "sepay provider is not implemented yet" };
  },

  parseWebhookPayload(_rawBody: string): ParsedTransaction[] {
    return [];
  },

  buildWebhookAckResponse() {
    return { status: 200, body: { ok: true } };
  },
};
