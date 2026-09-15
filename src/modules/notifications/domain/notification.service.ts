import { consoleChannel } from "../channels/console-channel";
import type { NotificationChannel, NotificationEvent } from "./notification.types";

// Extension point: add email/Zalo/CRM channels here later without
// touching any caller of emit().
const channels: NotificationChannel[] = [consoleChannel];

export async function emit(event: NotificationEvent): Promise<void> {
  await Promise.all(channels.map((channel) => channel.send(event)));
}
