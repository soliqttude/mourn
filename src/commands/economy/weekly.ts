import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "weekly",
  description: "Claim your weekly coins reward.",
  category: "economy",
  aliases: ["weeklycoins"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 604_800_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastWeekly");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏳ Weekly on cooldown. Come back in **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    const reward = Math.floor(Math.random() * 2000) + 1500;
    await addBalance(ctx.guild.id, ctx.user.id, reward);
    await setCooldown(ctx.guild.id, ctx.user.id, "lastWeekly");
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("📆 Weekly Reward").setDescription(`You claimed your weekly reward of **${formatCoins(reward)}** coins!`).addFields({ name: "New Balance", value: `${formatCoins(eco.balance)} coins`, inline: true }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
