import type { Client } from "discord.js";
import { db } from "../db/index.js";
import { birthdays, guildSettings } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { brandEmbed } from "../lib/embeds.js";

// FIX: previously nothing tracked "already wished this user this year," so if
// checkBirthdays ran more than once on the same calendar day (bot restart,
// interval overlap, manual re-trigger, etc.) everyone got double/triple-pinged.
// This is in-memory, so it resets on restart — if that's a real risk for your
// deploy setup (frequent restarts), this should move to a DB column instead
// (e.g. `lastWishedYear` on the birthdays row). Flagging that as a follow-up.
const alreadyWished = new Set<string>(); // key: `${year}-${guildId}-${userId}`

// Periodic cleanup so this doesn't grow forever across years.
setInterval(() => {
  const currentYear = new Date().getFullYear();
  for (const key of alreadyWished) {
    const year = Number(key.split("-")[0]);
    if (year < currentYear) alreadyWished.delete(key);
  }
}, 6 * 60 * 60_000).unref();

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export async function checkBirthdays(client: Client) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // FIX: Feb 29 birthdays previously never matched in non-leap years, so
  // those users silently never got wished 3 out of every 4 years. On a
  // non-leap Feb 28, also check for Feb 29 birthdays and treat them as today.
  const isFeb28NonLeap = month === 2 && day === 28 && !isLeapYear(year);

  const todayBdays = await db.select().from(birthdays).where(eq(birthdays.month, month));
  let todayFiltered = todayBdays.filter(b => b.day === day);

  if (isFeb28NonLeap) {
    const feb29Bdays = await db.select().from(birthdays).where(eq(birthdays.month, 2));
    todayFiltered = todayFiltered.concat(feb29Bdays.filter(b => b.day === 29));
  }

  if (!todayFiltered.length) return;

  const guildMap = new Map<string, string[]>();
  for (const b of todayFiltered) {
    const key = `${year}-${b.guildId}-${b.userId}`;
    if (alreadyWished.has(key)) continue; // dedup — already wished this user this year
    if (!guildMap.has(b.guildId)) guildMap.set(b.guildId, []);
    guildMap.get(b.guildId)!.push(b.userId);
  }
  if (!guildMap.size) return;

  // FIX: previously fetched the entire guildSettings table every run. Now
  // scoped to just the guilds that actually have a birthday today.
  const settingsRows = await db.select().from(guildSettings)
    .where(inArray(guildSettings.guildId, [...guildMap.keys()]));

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
        content: `## 🥂 A toast — <@${userId}>`,
        embeds: [brandEmbed({
          title: `✦ Happy Birthday, ${user.username} ✦`,
          description: [
            "```",
            "  ⋆｡°✩  ｡°✩⋆｡  ⋆｡°✩  ｡°✩⋆｡",
            "```",
            `Another year, another chapter written in gold.`,
            ``,
            `**${user.username}** is celebrating today — take a moment to raise a glass and wish them well. 🥂✨`,
          ].join("\n"),
          thumbnail: user.displayAvatarURL({ size: 256 }),
          color: 0xd4af37, // champagne gold
          footer: "wishing you a year as golden as this one",
          page: "Birthday",
        })],
      }).catch(() => {});

      alreadyWished.add(`${year}-${guildId}-${userId}`);
    }
  }
}
