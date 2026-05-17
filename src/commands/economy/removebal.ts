import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { removeBalance, getBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "removebal",
  description: "Remove coins from a user's balance (admin).",
  usage: "removebal [user] [amount]",
  examples: ["removebal"],
  category: "economy",
  permission: "admin",
  guildOnly: true,
  aliases: ["removemoney", "removecoins", "takemoney"],
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount to remove", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    const amount = ctx.getNumber("amount", true) ?? parseInt(ctx.args[1]);
    if (!target || !amount || amount <= 0) return ctx.reply({ embeds: [errorEmbed("Invalid input.")] });
    const bal = await getBalance(ctx.guild.id, target.id);
    const actual = Math.min(amount, bal.balance);
    await removeBalance(ctx.guild.id, target.id, actual);
    return ctx.reply({ embeds: [successEmbed(`Removed **${actual}** coins from **${target.tag}**.`)] });
  },
};
