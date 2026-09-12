import { getEnv } from "../../../shared/config/env";
import { callRpc } from "../../../shared/db/rpc";
import { NotFoundError } from "../../../shared/errors/app-error";
import { emit } from "../../notifications";
import * as paymentRepository from "../data/payment.repository";
import type { ParsedTransaction, PaymentProvider } from "./payment-provider.interface";
import { sepayProvider } from "./providers/sepay-provider";
import { vietqrStaticProvider } from "./providers/vietqr-static-provider";
import { toPaymentView, type PaymentRow, type PaymentView } from "./payment.types";

const providers: Record<string, PaymentProvider> = {
  vietqr_static: vietqrStaticProvider,
  sepay: sepayProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const env = getEnv();
  return providers[env.PAYMENT_PROVIDER];
}

export interface CreatePaymentForOrderInput {
  orderId: string;
  orderReference: string;
  amountVnd: number;
  expiresAt: Date;
}

export async function createPaymentForOrder(input: CreatePaymentForOrderInput): Promise<PaymentRow> {
  const provider = getPaymentProvider();
  const intent = await provider.createPaymentIntent({
    orderReference: input.orderReference,
    amountVnd: input.amountVnd,
    expiresAt: input.expiresAt,
  });

  return paymentRepository.insert({
    order_id: input.orderId,
    reference: intent.reference,
    provider: intent.provider,
    amount_expected_vnd: intent.amountExpectedVnd,
    amount_received_vnd: null,
    bank_account_number: intent.bankAccountNumber,
    bank_account_holder: intent.bankAccountHolder,
    bank_name: intent.bankName,
    qr_code_url: intent.qrCodeUrl,
    qr_payload: intent.qrPayload ?? null,
    expires_at: intent.expiresAt.toISOString(),
    paid_at: null,
  });
}

export async function getPaymentByReference(reference: string): Promise<PaymentView> {
  const row = await paymentRepository.findByReference(reference);
  if (!row) throw new NotFoundError(`Payment for order "${reference}" not found`);
  return toPaymentView(row);
}

type ApplyResult = { resultStatus: string; orderReference: string | null };

/**
 * The single entry point both the real webhook and the mock
 * dev-webhook call. Delegates the atomic check-match-apply logic to
 * the `apply_incoming_transaction` Postgres function (see migration
 * 0001) and fires a notification for the outcomes ops should know
 * about. Always returns normally (never throws) so the caller can
 * always ack the webhook with 200 — a thrown error here would risk
 * the provider retrying forever on a payload we already understood.
 */
export async function applyIncomingTransaction(
  provider: string,
  txn: ParsedTransaction,
): Promise<ApplyResult> {
  const rows = await callRpc<ApplyResult[] | { result_status: string; order_reference: string | null }[]>(
    "apply_incoming_transaction",
    {
      p_provider: provider,
      p_provider_transaction_id: txn.providerTransactionId,
      p_amount_vnd: txn.amountVnd,
      p_currency: txn.currency,
      p_raw_reference: txn.rawReferenceText,
      p_matched_reference: txn.matchedReference,
      p_occurred_at: txn.occurredAt.toISOString(),
      p_direction: txn.direction,
      p_raw_payload: txn.raw,
    },
  );

  const row = Array.isArray(rows) ? rows[0] : rows;
  const result: ApplyResult = { resultStatus: row.result_status, orderReference: row.order_reference };

  switch (result.resultStatus) {
    case "paid":
      await emit({ type: "order.paid", orderReference: result.orderReference!, totalVnd: txn.amountVnd });
      break;
    case "amount_mismatch":
      await emit({
        type: "order.payment_mismatched",
        orderReference: result.orderReference!,
        expectedVnd: 0, // logged in the transactions/payments rows; kept minimal here
        receivedVnd: txn.amountVnd,
      });
      break;
    case "unmatched_no_reference":
    case "unmatched_unknown_order":
      await emit({ type: "order.payment_unmatched", rawReference: txn.rawReferenceText });
      break;
    default:
      break; // duplicate_ignored, ignored_already_paid, ignored_payment_not_pending: no action needed
  }

  return result;
}
