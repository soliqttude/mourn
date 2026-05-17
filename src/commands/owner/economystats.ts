import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { sql, desc } from "drizzle-orm";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "economystats",
  description: "(Owner) Global economy stats across all servers.",
  usage: "economystats",
  examples: ["economystats"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });

    const [totals, richest] = await Promise.all([
      db.select({
        totalWallets: sql<number>`count(*)`,
        totalCoins: sql<number>`sum(${economy.balance} + ${economy.bank})`,
        totalWallet: sql<number>`sum(${economy.balance})`,
        totalBank: sql<number>`sum(${economy.bank})`,
        avgBalance: sql<number>`avg(${economy.balance})`,
        maxStreak: sql<number>`max(${economy.streak})`,
      }).from(economy),
      db.select().from(economy).orderBy(desc(sql`${economy.balance} + ${economy.bank}`)).limit(5),
    ]);

    const t = totals[0]!;
    const richestLines = await Promise.all(richest.map(async (r, i) => {
      const user = await ctx.client.users.fetch(r.userId).catch(() => null);
      return `${i + 1}. **${user?.username ?? r.userId}** — ${(r.balance + r.bank).toLocaleString()} coins`;
    }));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("📊 global economy stats")
          .addFields(
            { name: "total wallets", value: t.totalWallets?.toLocaleString() ?? "0", inline: true },
            { name: "total coins in circulation", value: t.totalCoins?.toLocaleString() ?? "0", inline: true },
            { name: "wallet coins", value: t.totalWallet?.toLocaleString() ?? "0", inline: true },
            { name: "banked coins", value: t.totalBank?.toLocaleString() ?? "0", inline: true },
            { name: "avg wallet balance", value: Math.round(t.avgBalance ?? 0).toLocaleString(), inline: true },
            { name: "highest daily streak", value: t.maxStreak?.toString() ?? "0", inline: true },
            { name: "🏆 richest globally", value: richestLines.join("\n") || "none", inline: false },
          )
          .setFooter({ text: config.embedFooter })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
