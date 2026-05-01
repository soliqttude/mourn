import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getEconomy } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "balance",
  aliases: ["bal", "money"],
  description: "Check your or another user's balance.",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const eco = await getEconomy(ctx.guild.id, target.id);
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `${target.username}'s wallet`,
          fields: [
            { name: "Cash", value: `🩸 **${eco.balance.toLocaleString()}**`, inline: true },
            { name: "Bank", value: `🏦 **${eco.bank.toLocaleString()}**`, inline: true },
            {
              name: "Net Worth",
              value: `💀 **${(eco.balance + eco.bank).toLocaleString()}**`,
              inline: true,
            },
          ],
          page: "Economy",
        }),
      ],
    });
  },
};
