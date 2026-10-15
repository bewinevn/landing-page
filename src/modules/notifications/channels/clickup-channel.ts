import { getEnv } from "../../../shared/config/env";
import { getSupabaseServerClient } from "../../../shared/db/supabase-server-client";
import type { NotificationChannel, NotificationEvent } from "../domain/notification.types";

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

interface PackingInfo {
  addressLine: string;
  city: string;
  note: string | null;
  items: { name: string; quantity: number; unitPriceVnd: number }[];
}

// Queries orders/order_items directly instead of importing the orders
// module's service layer, which would create a circular import (orders
// -> notifications -> orders, since order.service.ts is what emits this
// event) — same pattern as zalo-channel.ts's findDeliveryContact.
async function findPackingInfo(orderReference: string): Promise<PackingInfo | null> {
  const supabase = getSupabaseServerClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, delivery_address_line, delivery_city, delivery_note")
    .eq("reference", orderReference)
    .maybeSingle();
  if (error || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name_snapshot, quantity, unit_price_vnd")
    .eq("order_id", order.id);

  return {
    addressLine: order.delivery_address_line,
    city: order.delivery_city,
    note: order.delivery_note,
    items: (items ?? []).map((i) => ({
      name: i.product_name_snapshot,
      quantity: i.quantity,
      unitPriceVnd: i.unit_price_vnd,
    })),
  };
}

function paymentMethodLabel(method: string): string {
  if (method === "offline") return "Bán trực tiếp";
  if (method === "cod") return "COD";
  return "Chuyển khoản QR";
}

/**
 * Staff order processing via ClickUp: creates a task in a fixed list for
 * every new order (order.created) with everything needed to pack and
 * ship it — the ClickUp equivalent of telegram-channel.ts's "new order"
 * alert, for teams that track fulfillment as tasks instead of chat pings.
 * No-ops entirely when either env var is unset.
 */
export const clickupChannel: NotificationChannel = {
  async send(event: NotificationEvent) {
    if (event.type !== "order.created") return;

    const env = getEnv();
    if (!env.CLICKUP_API_TOKEN || !env.CLICKUP_LIST_ID) return;

    try {
      const packing = await findPackingInfo(event.orderReference);
      const itemLines = packing?.items.length
        ? packing.items.map((i) => `- ${i.name} x${i.quantity} — ${formatVnd(i.unitPriceVnd * i.quantity)}`).join("\n")
        : "(không lấy được danh sách sản phẩm)";

      const description = [
        `**Khách hàng:** ${event.customerName} — ${event.customerPhone}`,
        packing ? `**Địa chỉ:** ${packing.addressLine}, ${packing.city}` : "",
        packing?.note ? `**Ghi chú:** ${packing.note}` : "",
        `**Thanh toán:** ${paymentMethodLabel(event.paymentMethod)}`,
        `**Sản phẩm:**\n${itemLines}`,
        `**Tổng cộng:** ${formatVnd(event.totalVnd)}`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch(`https://api.clickup.com/api/v2/list/${env.CLICKUP_LIST_ID}/task`, {
        method: "POST",
        headers: {
          Authorization: env.CLICKUP_API_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Đơn ${event.orderReference} — ${event.customerName}`,
          description,
          assignees: env.CLICKUP_ASSIGNEE_ID ? [env.CLICKUP_ASSIGNEE_ID] : undefined,
          // Without this, ClickUp's API defaults to creating the task
          // silently (no push/email notification to the assignee) —
          // the whole point of this channel is to alert staff.
          notify_all: true,
        }),
      });

      if (!res.ok) {
        console.error(`[clickup-channel] create task failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      // Never let a notification failure break order creation.
      console.error("[clickup-channel] create task threw", err);
    }
  },
};
