import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "gayrate", description: "Find out how gay someone is.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to rate", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const seed = parseInt(target.id.slice(-8), 16) + 42;
    const rate = seed % 101;
    const filled = Math.round(rate / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    return ctx.reply({ embeds: [brandEmbed({ title: "🏳️‍🌈 Gay Rate", description: `**${target.username}** is **${rate}%** gay\n[${bar}]`, page: "Fun" })] });
  },
};
