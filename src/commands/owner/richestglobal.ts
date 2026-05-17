import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { desc } from "drizzle-orm";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "richestglobal",
  description: "(Owner) Top 15 richest users across ALL servers.",
  usage: "richestglobal",
  examples: ["richestglobal"],
  category: "owner",
  ownerOnly: true,
  aliases: ["globalrich", "globalleaderboard"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const rows = await db.select().from(economy).orderBy(desc(economy.balance)).limit(15);
    if (!rows.length) return ctx.reply({ content: "No economy data yet." });

    const lines = await Promise.all(rows.map(async (r, i) => {
      const user = await ctx.client.users.fetch(r.userId).catch(() => null);
      const guild = ctx.client.guilds.cache.get(r.guildId);
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `\`${i + 1}\``;
      return `${medal} **${user?.tag ?? r.userId}** — $${r.balance.toLocaleString()} *(${guild?.name ?? r.guildId})*`;
    }));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd740)
          .setTitle("👑 Global Richest")
          .setDescription(lines.join("\n"))
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
