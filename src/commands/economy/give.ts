import { ApplicationCommandOptionType } from "discord.js";
import { and, eq, sql } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { getEconomy, addBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "give",
  aliases: ["pay"],
  description: "Give coins to another user.",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    const amt = ctx.getNumber("amount", true);
    if (!target || !amt) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't pay yourself.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("Bots have no need for coins.")] });
    if (amt <= 0) return ctx.reply({ embeds: [errorEmbed("Invalid amount.")] });
    const eco = await getEconomy(ctx.guild.id, ctx.user.id);
    if (amt > eco.balance) return ctx.reply({ embeds: [errorEmbed("Not enough cash.")] });
    await db
      .update(economy)
      .set({ balance: sql`${economy.balance} - ${amt}` })
      .where(and(eq(economy.guildId, ctx.guild.id), eq(economy.userId, ctx.user.id)));
    await addBalance(ctx.guild.id, target.id, amt);
    return ctx.reply({
      embeds: [successEmbed(`You gave **${amt.toLocaleString()}** coins to <@${target.id}>.`)],
    });
  },
};
