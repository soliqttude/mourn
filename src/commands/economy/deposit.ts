import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "deposit",
  description: "Deposit coins from your wallet into your bank.",
  category: "economy",
  aliases: ["dep"],
  guildOnly: true,
  options: [
    { name: "amount", description: "Amount or 'all'", type: ApplicationCommandOptionType.String, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const input = ctx.getString("amount") ?? ctx.args[0];
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    const amount = input?.toLowerCase() === "all" ? eco.balance : parseInt(input ?? "0");
    if (!amount || amount <= 0) return ctx.reply({ content: "Provide a valid amount.", ephemeral: true } as any);
    const result = await depositToBank(ctx.guild.id, ctx.user.id, amount);
    const color = result.success ? 0x00e676 : 0xff4444;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(color).setDescription(result.message).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
