import { clickupChannel } from "../channels/clickup-channel";
import { consoleChannel } from "../channels/console-channel";
import { slackChannel } from "../channels/slack-channel";
import { telegramChannel } from "../channels/telegram-channel";
import { zaloChannel } from "../channels/zalo-channel";
import type { NotificationChannel, NotificationEvent } from "./notification.types";

// Extension point: add more channels here later without touching any
// caller of emit(). telegramChannel/slackChannel/zaloChannel/clickupChannel
// all no-op when unconfigured — e.g. leave TELEGRAM_BOT_TOKEN unset to use
// Slack instead of Telegram, no code change needed either way.
const channels: NotificationChannel[] = [consoleChannel, telegramChannel, slackChannel, zaloChannel, clickupChannel];

export async function emit(event: NotificationEvent): Promise<void> {
  await Promise.all(channels.map((channel) => channel.send(event)));
}
