export interface CreatePaymentIntentInput {
  orderReference: string;
  amountVnd: number;
  expiresAt: Date;
  customerName?: string;
}

export interface PaymentIntent {
  provider: string;
  reference: string;
  amountExpectedVnd: number;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bankName: string;
  qrCodeUrl: string;
  qrPayload?: string;
  expiresAt: Date;
  raw?: unknown;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  reason?: string;
}

export interface ParsedTransaction {
  providerTransactionId: string;
  amountVnd: number;
  currency: string;
  rawReferenceText: string;
  matchedReference: string | null;
  occurredAt: Date;
  direction: "in" | "out";
  raw: unknown;
}

export interface WebhookRequest {
  headers: Record<string, string>;
  rawBody: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  verifyWebhookSignature(request: WebhookRequest): WebhookVerificationResult;
  parseWebhookPayload(rawBody: string): ParsedTransaction[];
  buildWebhookAckResponse(): { status: number; body: unknown };
}
