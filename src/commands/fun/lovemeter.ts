import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const BARS = 10;

function lovePct(id1: string, id2: string): number {
  const combined = [id1, id2].sort().join("");
  let hash = 0;
  for (const ch of combined) hash = ((hash << 5) - hash) + ch.charCodeAt(0);
  return Math.abs(hash) % 101;
}

function buildBar(pct: number): string {
  const filled = Math.round((pct / 100) * BARS);
  return "❤️".repeat(filled) + "🖤".repeat(BARS - filled);
}

function getLabel(pct: number): string {
  if (pct >= 95) return "soulmates 💞";
  if (pct >= 80) return "deeply in love 💕";
  if (pct >= 65) return "real connection 💓";
  if (pct >= 50) return "something's there 💛";
  if (pct >= 35) return "it's complicated 🤍";
  if (pct >= 20) return "awkward energy 😬";
  return "total strangers 💀";
}

export const command: HybridCommand = {
  name: "lovemeter",
  description: "Measure compatibility between two users.",
  usage: "lovemeter",
  examples: ["lovemeter"],
  category: "fun",
  aliases: ["love", "compatibility"],
  options: [
    { name: "user", description: "First user", type: 6, required: true },
    { name: "user2", description: "Second user (default: you)", type: 6, required: false },
  ],
  async execute(ctx) {
    const user1 = await ctx.getUser("user", true);
    if (!user1) return;
    const user2 = (await ctx.getUser("user2")) ?? ctx.user;
    const pct = lovePct(user1.id, user2.id);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff69b4)
          .setTitle("💘 love meter")
          .setDescription([
            `**${user1.username}** ❤️ **${user2.username}**`,
            ``,
            `${buildBar(pct)}`,
            ``,
            `**${pct}%** — ${getLabel(pct)}`,
          ].join("\n"))
          .setThumbnail(user1.displayAvatarURL())
          .setFooter({ text: `${config.embedFooter} • purely scientific results` })
          .setTimestamp(),
      ],
    });
  },
};
