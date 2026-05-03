import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "addmoney",
  description: "Add coins to a user's wallet. Server admins only.",
  category: "economy",
  permission: "admin",
  guildOnly: true,
  aliases: ["givemoney"],
  options: [
    { name: "user", description: "The user to give money to", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount of coins to add", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    const amount = ctx.getNumber("amount", true) ?? parseInt(ctx.args[1]);
    if (!target || !amount || isNaN(amount) || amount <= 0)
      return ctx.reply({ embeds: [errorEmbed("Please provide a valid user and a positive amount.")] });
    await addBalance(ctx.guild.id, target.id, amount);
    return ctx.reply({
      embeds: [successEmbed(`Added **${amount.toLocaleString()}** coins to **${target.tag}`'s wallet.`)],
    });
  },
};
