import { applyIncomingTransaction, extractOrderReference, getPaymentProvider } from "../../payments";
import type { ParsedTransaction, WebhookRequest } from "../../payments";
import { UnauthorizedError } from "../../../shared/errors/app-error";
import type { WebhookHandleResult } from "./webhook.types";

/**
 * Handles an incoming webhook from the currently-configured real
 * payment provider (e.g. sepay). Verifies the signature first —
 * an invalid signature throws so the route can respond 401 without
 * ever touching the DB. Each parsed transaction goes through the
 * same applyIncomingTransaction() path the mock webhook uses.
 */
export async function handleProviderWebhook(request: WebhookRequest): Promise<WebhookHandleResult> {
  const provider = getPaymentProvider();

  const verification = provider.verifyWebhookSignature(request);
  if (!verification.isValid) {
    throw new UnauthorizedError(verification.reason ?? "Invalid webhook signature");
  }

  const transactions = provider.parseWebhookPayload(request.rawBody);
  for (const txn of transactions) {
    await applyIncomingTransaction(provider.name, txn);
  }

  return provider.buildWebhookAckResponse();
}

export interface MockWebhookInput {
  reference: string;
  amountVnd: number;
}

/**
 * Dev-only: simulates a single incoming bank transfer matching the
 * given order reference and amount, driving it through the exact
 * same apply_incoming_transaction path a real webhook would use.
 * This is what makes checkout testable end-to-end without a bank.
 */
export async function handleMockWebhook(input: MockWebhookInput): Promise<WebhookHandleResult> {
  const rawReferenceText = `BEWINE ${input.reference}`;
  const txn: ParsedTransaction = {
    providerTransactionId: `mock-${input.reference}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amountVnd: input.amountVnd,
    currency: "VND",
    rawReferenceText,
    matchedReference: extractOrderReference(rawReferenceText),
    occurredAt: new Date(),
    direction: "in",
    raw: input,
  };

  const result = await applyIncomingTransaction("mock", txn);
  return { status: 200, body: result };
}
