import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { claimDailyStreak } from "../../features/economy.js";
import { config } from "../../config.js";

const STREAK_EMOJIS = ["", "🔥", "🔥🔥", "💫", "⚡", "🌟", "💎", "👑"];

export const command: HybridCommand = {
  name: "daily",
  aliases: ["dailyclaim", "dl"],
  description: "Claim your daily reward. Consecutive days increase your streak bonus!",
  usage: "daily",
  examples: ["daily"],
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const result = await claimDailyStreak(ctx.guild.id, ctx.user.id);

    if (result.alreadyClaimed) {
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.errorColor)
            .setDescription(`already claimed. next daily: <t:${result.nextClaimTs}:R>`)
            .setFooter({ text: `${config.embedFooter} • economy` })
            .setTimestamp(),
        ],
      });
    }

    const streakEmoji = STREAK_EMOJIS[Math.min(result.streak, 7)] ?? "👑";
    const streakLabel = result.streak === 1 ? "day 1 — streak started!" : `day ${result.streak} streak ${streakEmoji}`;
    const nextCoins = Math.min(500 + result.streak * 50, 1500);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.successColor)
          .setTitle("📅 daily claimed")
          .setDescription([
            `**+${result.coins.toLocaleString()} coins** added to your wallet.`,
            ``,
            `🗓️ **${streakLabel}**`,
            `next daily: <t:${result.nextClaimTs}:R>`,
            result.streak < 21 ? `tomorrow's reward: **${nextCoins.toLocaleString()} coins**` : `you're maxed out at **1,500 coins/day** 👑`,
          ].join("\n"))
          .setFooter({ text: `${config.embedFooter} • economy` })
          .setTimestamp(),
      ],
    });
  },
};
