import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

function getDailyLuck(userId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const ch of userId + today) hash = (Math.imul(31, hash) + ch.charCodeAt(0)) | 0;
  return Math.abs(hash) % 101;
}

const TIERS = [
  { max: 10,  label: "💀 Cursed",        color: 0x1a0000 },
  { max: 25,  label: "🔴 Unlucky",       color: 0xff1744 },
  { max: 45,  label: "🟠 Below Average", color: 0xff6d00 },
  { max: 55,  label: "🟡 Neutral",       color: 0xffd740 },
  { max: 70,  label: "🟢 Lucky",         color: 0x00e676 },
  { max: 85,  label: "💎 Very Lucky",    color: 0x00b0ff },
  { max: 95,  label: "⭐ Incredibly Lucky", color: 0xaa00ff },
  { max: 101, label: "👑 GODLIKE LUCK",  color: 0xffea00 },
];

const TIPS = [
  "Try gambling today — the stars are aligned.",
  "Stay away from slot machines, trust me.",
  "This might be a good day to rob someone.",
  "Keep your coins safe in the bank.",
  "You might just hit jackpot if you try.",
  "Don't bother — the house always wins... today.",
  "Your aura is radiating wealth.",
  "Maybe sit this round out.",
];

export const command: HybridCommand = {
  name: "lucky",
  description: "Check your daily luck score — changes every 24 hours!",
  usage: "lucky",
  examples: ["lucky"],
  category: "fun",
  aliases: ["luckcheck", "luck", "myluck"],
  async execute(ctx) {
    const luck = getDailyLuck(ctx.user.id);
    const tier = TIERS.find(t => luck < t.max) ?? TIERS[TIERS.length - 1]!;
    const tip = TIPS[luck % TIPS.length]!;
    const bar = "█".repeat(Math.round(luck / 5)) + "░".repeat(20 - Math.round(luck / 5));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(tier.color)
          .setTitle(`🍀 Daily Luck — ${ctx.user.username}`)
          .setDescription([
            `**${tier.label}**`,
            "",
            `\`${bar}\` **${luck}/100**`,
            "",
            `💡 *${tip}*`,
          ].join("\n"))
          .setThumbnail(ctx.user.displayAvatarURL())
          .setFooter({ text: `${config.embedFooter} • Resets at midnight UTC` })
          .setTimestamp(),
      ],
    });
  },
};
