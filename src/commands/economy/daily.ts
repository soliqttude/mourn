import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "daily",
  description: "Claim your daily coins reward.",
  category: "economy",
  aliases: ["dailycoins"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 86_400_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastDaily");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏳ You already claimed your daily. Come back in **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    const reward = Math.floor(Math.random() * 500) + 200;
    await addBalance(ctx.guild.id, ctx.user.id, reward);
    await setCooldown(ctx.guild.id, ctx.user.id, "lastDaily");
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("📅 Daily Reward").setDescription(`You claimed your daily reward of **${formatCoins(reward)}** coins!`).addFields({ name: "New Balance", value: `${formatCoins(eco.balance)} coins`, inline: true }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
