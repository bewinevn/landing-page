import { getEnv } from "../../../shared/config/env";
import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";
import { sendZns } from "../../zalo";
import type { NotificationChannel, NotificationEvent } from "../domain/notification.types";

// "amount_vn_standard" is Zalo's own standard ZNS parameter for a VND
// amount — it renders its own currency formatting, so this must be a
// bare number string (no "₫" suffix) or Zalo appends/duplicates it.
function formatAmount(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

// Queries the orders table directly instead of importing the orders
// module's service layer, which would create a circular import
// (orders -> notifications -> orders, since order.service.ts is what
// emits these events in the first place).
async function findDeliveryContact(orderReference: string): Promise<{ name: string; phone: string } | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("delivery_full_name, delivery_phone")
    .eq("reference", orderReference)
    .maybeSingle();
  if (error || !data) return null;
  return { name: data.delivery_full_name, phone: data.delivery_phone };
}

/**
 * Customer-facing "payment confirmed" ZNS message. Fires on order.paid
 * only (bank-transfer confirmation) — COD orders don't go through
 * apply_incoming_transaction so this never fires for them, which is
 * correct: COD isn't "paid" until cash is collected on delivery.
 *
 * `template_data` keys match the "Xác nhận thanh toán đơn hàng thành
 * công" ZNS template (Chiến dịch → Quản lý Template): customer_name,
 * code (order reference), amount_vn_standard (bare VND number, no
 * currency symbol) — all standard Zalo-provided parameter types. If
 * the template is edited later, keep these three in sync with it.
 *
 * No-ops when ZALO_ZNS_TEMPLATE_ID isn't configured, or when the OA
 * hasn't completed OAuth linking yet (see /api/admin/zalo/authorize).
 */
export const zaloChannel: NotificationChannel = {
  async send(event: NotificationEvent) {
    if (event.type !== "order.paid") return;

    const env = getEnv();
    if (!env.ZALO_ZNS_TEMPLATE_ID) return;

    try {
      const contact = await findDeliveryContact(event.orderReference);
      if (!contact) return;

      await sendZns({
        phone: contact.phone,
        templateId: env.ZALO_ZNS_TEMPLATE_ID,
        templateData: {
          customer_name: contact.name,
          code: event.orderReference,
          amount_vn_standard: formatAmount(event.totalVnd),
        },
      });
    } catch (err) {
      // Never let a notification failure break payment processing.
      console.error("[zalo-channel] sendZns failed", err);
    }
  },
};
