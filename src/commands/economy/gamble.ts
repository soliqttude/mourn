import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "gamble",
  description: "Gamble an amount of coins with a 50/50 chance.",
  category: "economy",
  aliases: ["bet", "wager"],
  guildOnly: true,
  options: [
    { name: "amount", description: "Amount to gamble", type: ApplicationCommandOptionType.Integer, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[0] ?? "0");
    if (!amount || amount < 10) return ctx.reply({ content: "Minimum gamble is 10 coins.", ephemeral: true } as any);
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    if (amount > eco.balance) return ctx.reply({ content: "Not enough coins.", ephemeral: true } as any);
    const won = Math.random() > 0.5;
    await addBalance(ctx.guild.id, ctx.user.id, won ? amount : -amount);
    const color = won ? 0x00e676 : 0xff4444;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle(won ? "🎲 You Won!" : "🎲 You Lost!").setDescription(won ? `You gambled **${formatCoins(amount)}** and doubled it!` : `You gambled **${formatCoins(amount)}** and lost it all.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
