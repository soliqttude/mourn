import { and, eq } from "drizzle-orm";
import type { Client, Message } from "discord.js";
import { db } from "../db/index.js";
import { afk } from "../db/schema.js";
import { brandEmbed, infoEmbed } from "../lib/embeds.js";
import { formatRelative } from "../lib/time.js";

export async function setAfk(
  guildId: string,
  userId: string,
  message: string
) {
  await db
    .insert(afk)
    .values({ guildId, userId, message })
    .onConflictDoUpdate({
      target: [afk.guildId, afk.userId],
      set: { message, since: new Date() },
    });
}

export async function clearAfk(guildId: string, userId: string) {
  const rows = await db
    .delete(afk)
    .where(and(eq(afk.guildId, guildId), eq(afk.userId, userId)))
    .returning();
  return rows[0] ?? null;
}

export async function handleAfk(client: Client, message: Message) {
  if (!message.guild) return;

  const own = await db
    .select()
    .from(afk)
    .where(and(eq(afk.guildId, message.guild.id), eq(afk.userId, message.author.id)));
  if (own[0]) {
    await clearAfk(message.guild.id, message.author.id);
    await message
      .reply({
        embeds: [
          infoEmbed(
            `Welcome back <@${message.author.id}>, I removed your AFK status.`
          ),
        ],
      })
      .catch(() => {});
  }

  const mentioned = message.mentions.users;
  if (mentioned.size === 0) return;
  for (const [, u] of mentioned) {
    if (u.id === message.author.id) continue;
    const row = await db
      .select()
      .from(afk)
      .where(and(eq(afk.guildId, message.guild.id), eq(afk.userId, u.id)));
    if (!row[0]) continue;
    await message
      .reply({
        embeds: [
          brandEmbed({
            description: `💤 <@${u.id}> is AFK: **${row[0].message}** — ${formatRelative(row[0].since)}`,
            page: "AFK",
          }),
        ],
        allowedMentions: { parse: [] },
      })
      .catch(() => {});
    break;
  }
}
