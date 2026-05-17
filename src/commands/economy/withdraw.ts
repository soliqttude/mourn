import { ApplicationCommandOptionType } from "discord.js";
import { and, eq, sql } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { getEconomy } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "withdraw",
  aliases: ["with"],
  description: "Withdraw from your bank.",
  usage: "withdraw [amount]",
  examples: ["withdraw"],
  category: "economy",
  guildOnly: true,
  options: [
    { name: "amount", description: "Amount or 'all'", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const raw = ctx.getString("amount", true);
    if (!raw) return;
    const eco = await getEconomy(ctx.guild.id, ctx.user.id);
    let amt = raw.toLowerCase() === "all" ? eco.bank : parseInt(raw, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      return ctx.reply({ embeds: [errorEmbed("Invalid amount.")] });
    }
    if (amt > eco.bank) return ctx.reply({ embeds: [errorEmbed("Not enough in bank.")] });
    await db
      .update(economy)
      .set({
        balance: sql`${economy.balance} + ${amt}`,
        bank: sql`${economy.bank} - ${amt}`,
      })
      .where(and(eq(economy.guildId, ctx.guild.id), eq(economy.userId, ctx.user.id)));
    return ctx.reply({ embeds: [successEmbed(`Withdrew **${amt.toLocaleString()}** coins.`)] });
  },
};
