import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getEconomy, calcDailyCoins } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "streak",
  aliases: ["dailystreak", "combo"],
  description: "Check your daily claim streak.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const eco = await getEconomy(ctx.guild.id, ctx.user.id);
    const now = Date.now();
    const DAILY_MS = 24 * 60 * 60 * 1000;
    const STREAK_EXPIRE_MS = 48 * 60 * 60 * 1000;

    const sinceLastDaily = eco.lastDaily ? now - eco.lastDaily.getTime() : null;
    const nextClaimTs = eco.lastDaily ? Math.floor((eco.lastDaily.getTime() + DAILY_MS) / 1000) : null;
    const canClaim = sinceLastDaily === null || sinceLastDaily >= DAILY_MS;
    const streakAlive = sinceLastDaily !== null && sinceLastDaily < STREAK_EXPIRE_MS;
    const currentStreak = streakAlive ? eco.streak : 0;
    const nextCoins = calcDailyCoins(currentStreak);
    const maxCoins = 1500;

    const streakBar = currentStreak > 0
      ? "🔥".repeat(Math.min(currentStreak, 10)) + (currentStreak > 10 ? ` ×${currentStreak}` : "")
      : "no streak";

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("🗓️ daily streak")
          .addFields(
            { name: "streak", value: streakBar, inline: true },
            { name: "days", value: `**${currentStreak}**`, inline: true },
            { name: "today's reward", value: `**${nextCoins.toLocaleString()} coins**`, inline: true },
            { name: "claim status", value: canClaim ? "✅ ready to claim!" : `⏳ next claim: <t:${nextClaimTs}:R>`, inline: false },
            { name: "max daily (day 21+)", value: `${maxCoins.toLocaleString()} coins`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • claim within 48h to keep your streak` })
          .setTimestamp(),
      ],
    });
  },
};
