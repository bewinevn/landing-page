import type { NotificationChannel, NotificationEvent } from "../domain/notification.types";

/**
 * MVP stub channel — logs the event so ops can see what happened
 * (e.g. an unmatched or mismatched payment) until a real channel
 * (email, Zalo, CRM) is wired up.
 */
export const consoleChannel: NotificationChannel = {
  async send(event: NotificationEvent) {
    console.log(`[notification] ${event.type}`, event);
  },
};
