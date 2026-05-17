import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "simprate",
  aliases: ["simp", "simpcheck"], description: "Find out how much of a simp someone is.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to rate", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const seed = parseInt(target.id.slice(-8), 16) + 77;
    const rate = seed % 101;
    const filled = Math.round(rate / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    const verdict = rate > 80 ? "🚨 Certified Simp!" : rate > 50 ? "😬 Pretty simpy." : rate > 20 ? "👀 Mild simp." : "😎 Not a simp.";
    return ctx.reply({ embeds: [brandEmbed({ title: "🥺 Simp Rate", description: `**${target.username}** is **${rate}%** simp\n[${bar}]\n${verdict}`, page: "Fun" })] });
  },
};
