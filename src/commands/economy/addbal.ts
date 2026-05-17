import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "addbal",
  description: "Add coins to a user's balance (admin).",
  usage: "addbal [user] [amount]",
  examples: ["addbal"],
  category: "economy",
  permission: "admin",
  guildOnly: true,
  aliases: ["addmoney", "addcoins"],
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount to add", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    const amount = ctx.getNumber("amount", true) ?? parseInt(ctx.args[1]);
    if (!target || !amount || amount <= 0) return ctx.reply({ embeds: [errorEmbed("Invalid input.")] });
    await addBalance(ctx.guild.id, target.id, amount);
    return ctx.reply({ embeds: [successEmbed(`Added **${amount}** coins to **${target.tag}**.`)] });
  },
};
