import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getEconomy } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "cooldowns",
  description: "Check your economy cooldowns.",
  usage: "cooldowns",
  examples: ["cooldowns"],
  category: "economy",
  guildOnly: true,
  aliases: ["cd", "timers"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const eco = await getEconomy(ctx.guild.id, ctx.user.id);
    const now = Date.now();

    const DAILY_CD = 24 * 60 * 60 * 1000;
    const STREAK_EXPIRE = 48 * 60 * 60 * 1000;

    const dailyReady = !eco.lastDaily || now - eco.lastDaily.getTime() >= DAILY_CD;
    const dailyNext = eco.lastDaily ? Math.floor((eco.lastDaily.getTime() + DAILY_CD) / 1000) : null;
    const streakAlive = eco.lastDaily && now - eco.lastDaily.getTime() < STREAK_EXPIRE;

    const lines = [
      `📅 **daily** — ${dailyReady ? "✅ ready!" : `⏳ <t:${dailyNext}:R>`}`,
      `🔥 **streak** — ${eco.streak > 0 && streakAlive ? `${eco.streak} day${eco.streak > 1 ? "s" : ""} (expires <t:${Math.floor((eco.lastDaily!.getTime() + STREAK_EXPIRE) / 1000)}:R>)` : "none"}`,
      ``,
      `_hourly, work, fish, hunt, dig, mine, crime, beg timers reset on bot restart._`,
    ];

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("⏱️ your cooldowns")
          .setDescription(lines.join("\n"))
          .setFooter({ text: `${config.embedFooter} • economy` })
          .setTimestamp(),
      ],
    });
  },
};
