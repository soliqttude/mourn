import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

function getShipBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function getShipText(pct: number): string {
  if (pct >= 90) return "soulmates 💍";
  if (pct >= 75) return "deeply in love 💘";
  if (pct >= 60) return "strong connection 💕";
  if (pct >= 45) return "something's there 💫";
  if (pct >= 30) return "maybe friends 🤝";
  if (pct >= 15) return "awkward 😬";
  return "absolutely not 💔";
}

export const command: HybridCommand = {
  name: "ship",
  aliases: ["shiplove", "couple"],
  description: "Check the compatibility between two users.",
  category: "fun",
  options: [
    { name: "user1", description: "First user", type: ApplicationCommandOptionType.User, required: true },
    { name: "user2", description: "Second user", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    const u1 = await ctx.getUser("user1", true);
    const u2 = await ctx.getUser("user2", true);
    if (!u1 || !u2) return;
    const seed = (BigInt(u1.id) + BigInt(u2.id)) % 100n;
    const pct = Number(seed);
    return ctx.reply({
      embeds: [brandEmbed({
        title: `${u1.username} ❤️ ${u2.username}`,
        description: `**${pct}%** — ${getShipText(pct)}\n\`${getShipBar(pct)}\``,
        page: "Ship",
      })],
    });
  },
};
