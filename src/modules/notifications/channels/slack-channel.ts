import { getEnv } from "../../../shared/config/env";
import type { NotificationChannel, NotificationEvent } from "../domain/notification.types";

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

/**
 * Renders a Slack message (mrkdwn syntax — *bold*, not HTML) for the
 * events staff actually need to act on. Returns null for events with no
 * useful staff-facing message, so the channel silently skips them.
 */
function renderMessage(event: NotificationEvent): string | null {
  switch (event.type) {
    case "order.created": {
      const methodLabel =
        event.paymentMethod === "offline" ? "Bán trực tiếp" : event.paymentMethod === "cod" ? "COD" : "Chuyển khoản QR";
      return (
        `🆕 *Đơn hàng mới* ${event.orderReference}\n` +
        `Khách: ${event.customerName} (${event.customerPhone})\n` +
        `Thanh toán: ${methodLabel}\n` +
        `Tổng: ${formatVnd(event.totalVnd)}`
      );
    }
    case "order.paid":
      return `✅ *Đã nhận thanh toán* ${event.orderReference} — ${formatVnd(event.totalVnd)}`;
    case "order.payment_mismatched":
      return (
        `⚠️ *Sai số tiền chuyển khoản* ${event.orderReference}\n` +
        `Cần: ${formatVnd(event.expectedVnd)} — Nhận: ${formatVnd(event.receivedVnd)}`
      );
    case "order.payment_unmatched":
      return `⚠️ *Chuyển khoản không khớp đơn nào*\nNội dung: ${event.rawReference ?? "(không có)"}`;
    default:
      return null;
  }
}

/**
 * Staff order notifications via a Slack Incoming Webhook — no bot/app
 * needed, just a webhook URL. Set up: Slack workspace → Settings &
 * administration → Manage apps → search "Incoming Webhooks" → Add to
 * Slack → pick the channel → copy the generated URL into
 * SLACK_WEBHOOK_URL. No-ops entirely when unset.
 */
export const slackChannel: NotificationChannel = {
  async send(event: NotificationEvent) {
    const env = getEnv();
    if (!env.SLACK_WEBHOOK_URL) return;

    const text = renderMessage(event);
    if (!text) return;

    try {
      const res = await fetch(env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        console.error(`[slack-channel] webhook post failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      // Never let a notification failure break the caller (order
      // creation, payment webhook) — log and move on.
      console.error("[slack-channel] webhook post threw", err);
    }
  },
};
