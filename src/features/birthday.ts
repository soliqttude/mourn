import type { Client } from "discord.js";
import { db } from "../db/index.js";
import { birthdays, guildSettings } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { brandEmbed } from "../lib/embeds.js";

export async function checkBirthdays(client: Client) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const todayBdays = await db.select().from(birthdays)
    .where(eq(birthdays.month, month));
  const todayFiltered = todayBdays.filter(b => b.day === day);
  if (!todayFiltered.length) return;
  const guildMap = new Map<string, string[]>();
  for (const b of todayFiltered) {
    if (!guildMap.has(b.guildId)) guildMap.set(b.guildId, []);
    guildMap.get(b.guildId)!.push(b.userId);
  }
  const settingsRows = await db.select().from(guildSettings);
  for (const [guildId, userIds] of guildMap) {
    const settings = settingsRows.find(s => s.guildId === guildId);
    if (!(settings as any)?.birthdayChannel) continue;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const ch = guild.channels.cache.get((settings as any).birthdayChannel);
    if (!ch?.isTextBased()) continue;
    for (const userId of userIds) {
      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) continue;
      await (ch as any).send({
        content: `<@${userId}>`,
        embeds: [brandEmbed({
          title: "🎂 Happy Birthday!",
          description: `Today is **${user.username}**'s birthday! Wish them well! 🎉`,
          thumbnail: user.displayAvatarURL(),
          page: "Birthday",
        })],
      }).catch(() => {});
    }
  }
}
