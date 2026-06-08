import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "balance",
  description: "Check your or another user's wallet & bank balance.",
  category: "economy",
  aliases: ["bal", "coins", "wallet"],
  guildOnly: true,
  options: [
    { name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user") ?? ctx.user;
    const eco = await getBalance(ctx.guild.id, target.id);
    return ctx.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`💰 ${target.username}'s Balance`)
        .addFields(
          { name: "Wallet", value: `${formatCoins(eco.balance)} coins`, inline: true },
          { name: "Bank", value: `${formatCoins(eco.bank)} / ${formatCoins(eco.bankCap)} coins`, inline: true },
          { name: "Net Worth", value: `${formatCoins(eco.balance + eco.bank)} coins`, inline: true },
        )
        .setThumbnail(target.displayAvatarURL())
        .setFooter({ text: config.embedFooter })
        .setTimestamp()
    ] });
  },
};
