import type { Client, Message } from "discord.js";
import { db } from "../db/index.js";
import { autopublishChannels } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function handleAutopublish(client: Client, message: Message) {
  if (!message.guild || message.author.bot) return;
  if (!(message.channel as any).crosspostable) return;
  const rows = await db.select().from(autopublishChannels)
    .where(eq(autopublishChannels.guildId, message.guild.id));
  const enabled = rows.some(r => r.channelId === message.channel.id);
  if (!enabled) return;
  await (message as any).crosspost().catch(() => {});
}
