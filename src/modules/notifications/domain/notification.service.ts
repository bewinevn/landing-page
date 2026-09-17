import { consoleChannel } from "../channels/console-channel";
import { telegramChannel } from "../channels/telegram-channel";
import { zaloChannel } from "../channels/zalo-channel";
import type { NotificationChannel, NotificationEvent } from "./notification.types";

// Extension point: add more channels here later without touching any
// caller of emit(). telegramChannel/zaloChannel no-op when unconfigured.
const channels: NotificationChannel[] = [consoleChannel, telegramChannel, zaloChannel];

export async function emit(event: NotificationEvent): Promise<void> {
  await Promise.all(channels.map((channel) => channel.send(event)));
}
