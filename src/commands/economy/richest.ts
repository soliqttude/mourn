import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

export const command: HybridCommand = {
  name: "richest",
  description: "Show the richest members in the server.",
  usage: "richest",
  examples: ["richest"],
  category: "economy",
  guildOnly: true,
  aliases: ["wealthy", "balancetop"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await db.select().from(economy)
      .where(eq(economy.guildId, ctx.guild.id))
      .orderBy(desc(sql`${economy.balance} + ${economy.bank}`))
      .limit(10);
    if (!rows.length) return ctx.reply({ embeds: [brandEmbed({ title: "Richest Members", description: "No economy data yet.", page: "Economy" })] });
    const list = rows.map((r, i) => `**${i + 1}.** <@${r.userId}> — ${(r.balance + r.bank).toLocaleString()} coins`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: "💰 Richest Members", description: list, page: "Economy" })] });
  },
};
