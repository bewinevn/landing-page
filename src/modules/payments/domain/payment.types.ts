export interface PaymentRow {
  id: string;
  order_id: string;
  reference: string;
  provider: string;
  status: "pending" | "paid" | "mismatched" | "expired" | "failed" | "refunded";
  amount_expected_vnd: number;
  amount_received_vnd: number | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  qr_code_url: string | null;
  qr_payload: string | null;
  expires_at: string | null;
  paid_at: string | null;
}

/** Presentation-ready payment/QR block returned by the API. */
export interface PaymentView {
  reference: string;
  status: PaymentRow["status"];
  amountExpectedVnd: number;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bankName: string;
  qrCodeUrl: string;
  expiresAt: string | null;
}

export function toPaymentView(row: PaymentRow): PaymentView {
  return {
    reference: row.reference,
    status: row.status,
    amountExpectedVnd: row.amount_expected_vnd,
    bankAccountNumber: row.bank_account_number ?? "",
    bankAccountHolder: row.bank_account_holder ?? "",
    bankName: row.bank_name ?? "",
    qrCodeUrl: row.qr_code_url ?? "",
    expiresAt: row.expires_at,
  };
}
