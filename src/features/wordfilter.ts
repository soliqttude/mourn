import type { Client, Message, TextChannel } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { filterExempts, filterWhitelist, wordFilter } from "../db/schema.js";
import { hasModPerms } from "../lib/permissions.js";

export async function handleWordFilter(_client: Client, message: Message): Promise<void> {
  if (!message.guild || message.author.bot || !message.member) return;
  if (hasModPerms(message.member)) return;

  const roles = message.member.roles.cache;
  const exemptions = await db.select().from(filterExempts).where(and(
    eq(filterExempts.guildId, message.guild.id), eq(filterExempts.filterType, "word")
  ));
  if (exemptions.some(row => roles.has(row.roleId))) return;

  const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, message.guild.id));
  if (!words.length) return;
  const whitelist = await db.select().from(filterWhitelist).where(and(
    eq(filterWhitelist.guildId, message.guild.id), eq(filterWhitelist.filterType, "word")
  ));
  const lower = message.content.toLowerCase();
  const matched = words.find(row => {
    const word = row.word.toLowerCase();
    if (!lower.includes(word)) return false;
    return !whitelist.some(allowed => allowed.value && lower.includes(allowed.value.toLowerCase()) &&
      (allowed.value.toLowerCase() === word || allowed.value.toLowerCase().includes(word)));
  });
  if (!matched) return;

  await message.delete().catch(() => {});
  await (message.channel as TextChannel).send({
    content: `<@${message.author.id}>, that word is not allowed here.`,
    allowedMentions: { users: [message.author.id] },
  }).catch(() => {});
}
