import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const COOLDOWN = 60 * 60 * 1000;
const lastClaim = new Map<string, number>();
const hourlyStreak = new Map<string, number>();

export const command: HybridCommand = {
  name: "hourly",
  description: "Claim your hourly coin reward. Claim on time to build a streak bonus.",
  usage: "hourly",
  examples: ["hourly"],
  category: "economy",
  guildOnly: true,
  aliases: ["hr", "hourlyclaim"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const now = Date.now();
    const last = lastClaim.get(key) ?? 0;
    const diff = now - last;

    if (diff < COOLDOWN) {
      const remaining = COOLDOWN - diff;
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.errorColor)
            .setDescription(`already claimed. come back in **${m}m ${s}s**.`)
            .setFooter({ text: `${config.embedFooter} • economy` })
            .setTimestamp(),
        ],
      });
    }

    const amount = Math.floor(Math.random() * 201) + 100;

    // streak: only counts if claimed within 2 hours (on time-ish)
    const streak = last > 0 && diff < COOLDOWN * 2
      ? (hourlyStreak.get(key) ?? 0) + 1
      : 1;
    hourlyStreak.set(key, streak);
    lastClaim.set(key, now);

    const bonus = streak >= 3 ? Math.min(Math.floor((streak - 2) * 15), 150) : 0;
    const total = amount + bonus;

    await addBalance(ctx.guild.id, ctx.user.id, total);

    const lines = [
      `you received **${amount}** coins.`,
      bonus > 0 ? `🔥 on-time streak ×${streak}: **+${bonus}** bonus coins` : ``,
      ``,
      `**total:** ${total.toLocaleString()} coins`,
    ].filter(l => l !== undefined);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.successColor)
          .setTitle("⏰ hourly claimed")
          .setDescription(lines.join("\n"))
          .setFooter({ text: `${config.embedFooter} • next hourly in 1 hour` })
          .setTimestamp(),
      ],
    });
  },
};
