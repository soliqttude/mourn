import type { Client, Message, TextChannel } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { wordFilter } from "../db/schema.js";
import { hasModPerms } from "../lib/permissions.js";

export async function handleWordFilter(client: Client, message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;
  if (message.member && hasModPerms(message.member)) return;

  const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, message.guild.id));
  if (words.length === 0) return;

  const lower = message.content.toLowerCase();
  const matched = words.find((w) => lower.includes(w.word.toLowerCase()));
  if (!matched) return;

  await message.delete().catch(() => {});
  await (message.channel as TextChannel)
    .send({ content: `<@${message.author.id}>, that word is not allowed here.` })
    .catch(() => {});
}
