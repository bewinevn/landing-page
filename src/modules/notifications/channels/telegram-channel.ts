import { getEnv } from "../../../shared/config/env";
import type { NotificationChannel, NotificationEvent } from "../domain/notification.types";

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

/**
 * Renders a Telegram message for the events staff actually need to act
 * on (a new order to pack, or money that landed but needs review).
 * Returns null for events with no useful staff-facing message, so the
 * channel silently skips them.
 */
function renderMessage(event: NotificationEvent): string | null {
  switch (event.type) {
    case "order.created": {
      const methodLabel =
        event.paymentMethod === "offline" ? "Bán trực tiếp" : event.paymentMethod === "cod" ? "COD" : "Chuyển khoản QR";
      return (
        `🆕 <b>Đơn hàng mới</b> ${event.orderReference}\n` +
        `Khách: ${event.customerName} (${event.customerPhone})\n` +
        `Thanh toán: ${methodLabel}\n` +
        `Tổng: ${formatVnd(event.totalVnd)}`
      );
    }
    case "order.paid":
      return `✅ <b>Đã nhận thanh toán</b> ${event.orderReference} — ${formatVnd(event.totalVnd)}`;
    case "order.payment_mismatched":
      return (
        `⚠️ <b>Sai số tiền chuyển khoản</b> ${event.orderReference}\n` +
        `Cần: ${formatVnd(event.expectedVnd)} — Nhận: ${formatVnd(event.receivedVnd)}`
      );
    case "order.payment_unmatched":
      return `⚠️ <b>Chuyển khoản không khớp đơn nào</b>\nNội dung: ${event.rawReference ?? "(không có)"}`;
    default:
      return null;
  }
}

/**
 * Staff order notifications via a Telegram bot — the simplest channel
 * that needs no business verification or template approval (unlike
 * Zalo ZNS). Set up: message @BotFather to create a bot and get its
 * token, add the bot to the staff group, send it any message, then
 * read https://api.telegram.org/bot<token>/getUpdates to find the
 * group's chat id. Put both in .env as TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID.
 * No-ops entirely when either is unset, so this is safe to leave
 * unconfigured.
 */
export const telegramChannel: NotificationChannel = {
  async send(event: NotificationEvent) {
    const env = getEnv();
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;

    const text = renderMessage(event);
    if (!text) return;

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
      });
      if (!res.ok) {
        console.error(`[telegram-channel] sendMessage failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      // Never let a notification failure break the caller (order
      // creation, payment webhook) — log and move on.
      console.error("[telegram-channel] sendMessage threw", err);
    }
  },
};
