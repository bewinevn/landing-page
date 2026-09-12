export type NotificationEvent =
  | { type: "order.paid"; orderReference: string; totalVnd: number }
  | { type: "order.payment_mismatched"; orderReference: string; expectedVnd: number; receivedVnd: number }
  | { type: "order.payment_unmatched"; rawReference: string | null }
  | { type: "order.expired"; orderReference: string };

export interface NotificationChannel {
  send(event: NotificationEvent): Promise<void>;
}
