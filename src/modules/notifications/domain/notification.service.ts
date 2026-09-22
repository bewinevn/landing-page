import { clickupChannel } from "../channels/clickup-channel";
import { consoleChannel } from "../channels/console-channel";
import { telegramChannel } from "../channels/telegram-channel";
import { zaloChannel } from "../channels/zalo-channel";
import type { NotificationChannel, NotificationEvent } from "./notification.types";

// Extension point: add more channels here later without touching any
// caller of emit(). telegramChannel/zaloChannel/clickupChannel all no-op
// when unconfigured.
const channels: NotificationChannel[] = [consoleChannel, telegramChannel, zaloChannel, clickupChannel];

export async function emit(event: NotificationEvent): Promise<void> {
  await Promise.all(channels.map((channel) => channel.send(event)));
}
