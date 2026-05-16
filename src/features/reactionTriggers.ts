import { type Client, type Message } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { reactionTriggers } from "../db/schema.js";
import { logger } from "../lib/logger.js";

const cache = new Map<string, { trigger: string; emoji: string }[]>();

export function invalidateReactionTriggerCache(guildId: string) {
  cache.delete(guildId);
}

async function getTriggers(guildId: string) {
  if (cache.has(guildId)) return cache.get(guildId)!;
  const rows = await db.select().from(reactionTriggers).where(eq(reactionTriggers.guildId, guildId));
  cache.set(guildId, rows);
  return rows;
}

export async function handleReactionTriggers(client: Client, message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;
  const triggers = await getTriggers(message.guild.id).catch(() => []);
  if (!triggers.length) return;

  const content = message.content.toLowerCase();
  for (const { trigger, emoji } of triggers) {
    if (content.includes(trigger.toLowerCase())) {
      await message.react(emoji).catch((err) => logger.warn({ err }, "reaction trigger react failed"));
    }
  }
}
