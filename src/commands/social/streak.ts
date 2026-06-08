import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const streaks = new Map<string, { count: number; last: number }>();

export const command: HybridCommand = {
  name: "streak",
  description: "Check in daily to build your streak.",
  category: "social",
  aliases: ["checkin", "daily_streak"],
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const data = streaks.get(key) ?? { count: 0, last: 0 };
    const now = Date.now();
    const dayAgo = now - 86400000;
    const twoDaysAgo = now - 172800000;
    if (data.last > dayAgo) {
      const remaining = 86400000 - (now - data.last);
      const h = Math.floor(remaining/3600000), m = Math.floor((remaining%3600000)/60000);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`🔥 Already checked in today! Come back in **${h}h ${m}m**. Current streak: **${data.count}**`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    const newCount = data.last < twoDaysAgo ? 1 : data.count + 1;
    streaks.set(key, { count: newCount, last: now });
    const reset = data.last < twoDaysAgo && data.count > 0;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff6600).setTitle("🔥 Daily Check-in").setDescription(reset ? `Streak reset! Your new streak: **1**` : `✅ Checked in! Streak: **${newCount}** day${newCount!==1?"s":""}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
