import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "cringe",
  aliases: ["ew", "yikes"], description: "Rate someone's cringe level.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to rate", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const seed = parseInt(target.id.slice(-8), 16) + 13;
    const rate = seed % 101;
    const filled = Math.round(rate / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    const verdict = rate > 90 ? "💀 Mega cringe." : rate > 60 ? "😬 Pretty cringe." : rate > 30 ? "😅 Slightly cringe." : "😎 Cool as ice.";
    return ctx.reply({ embeds: [brandEmbed({ title: "😬 Cringe Rate", description: `**${target.username}** is **${rate}%** cringe\n[${bar}]\n${verdict}`, page: "Fun" })] });
  },
};
