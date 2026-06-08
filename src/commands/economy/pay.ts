import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "pay",
  description: "Pay coins to another user.",
  category: "economy",
  aliases: ["give", "transfer"],
  guildOnly: true,
  options: [
    { name: "user", description: "Recipient", type: ApplicationCommandOptionType.User, required: true }, { name: "amount", description: "Amount to pay", type: ApplicationCommandOptionType.Integer, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[1] ?? "0");
    if (!target || target.id === ctx.user.id || target.bot) return ctx.reply({ content: "Invalid recipient.", ephemeral: true } as any);
    if (!amount || amount < 1) return ctx.reply({ content: "Provide a valid amount.", ephemeral: true } as any);
    const result = await transferCoins(ctx.guild.id, ctx.user.id, target.id, amount);
    const color = result.success ? 0x00e676 : 0xff4444;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(color).setDescription(result.success ? `💸 You paid **${formatCoins(amount)}** coins to **${target.username}**!` : result.message).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
