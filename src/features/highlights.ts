import type { Client, Message } from "discord.js";
import { db } from "../db/index.js";
import { highlights } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { brandEmbed } from "../lib/embeds.js";

const recentlySent = new Map<string, number>();

export async function handleHighlights(client: Client, message: Message) {
  if (!message.guild || message.author.bot) return;
  const guildHighlights = await db.select().from(highlights).where(eq(highlights.guildId, message.guild.id));
  if (!guildHighlights.length) return;
  const content = message.content.toLowerCase();
  const notified = new Set<string>();
  for (const hl of guildHighlights) {
    if (hl.userId === message.author.id) continue;
    if (notified.has(hl.userId)) continue;
    if (!content.includes(hl.keyword)) continue;
    const key = `${hl.userId}:${message.channel.id}`;
    const last = recentlySent.get(key) ?? 0;
    if (Date.now() - last < 30_000) continue;
    const member = await message.guild.members.fetch(hl.userId).catch(() => null);
    if (!member) continue;
    const perms = (message.channel as any).permissionsFor?.(member);
    if (perms && !perms.has("ViewChannel")) continue;
    notified.add(hl.userId);
    recentlySent.set(key, Date.now());
    const user = await client.users.fetch(hl.userId).catch(() => null);
    if (!user) continue;
    await user.send({
      embeds: [brandEmbed({
        title: `🔔 Highlight in #${(message.channel as any).name ?? "channel"}`,
        description: `Your keyword **${hl.keyword}** was mentioned in **${message.guild.name}**.\n\n> ${message.content.slice(0, 500)}\n\n[Jump to message](${message.url})`,
        user: message.author,
        page: "Highlights",
      })],
    }).catch(() => {});
  }
}
