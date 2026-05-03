import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "pp",
  description: "Check someone's pp size.",
  category: "fun",
  options: [{ name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const size = Number(BigInt(target.id) % 15n);
    const bar = "8" + "=".repeat(size) + "D";
    return ctx.reply({ embeds: [brandEmbed({ title: `${target.username}'s pp`, description: `\`${bar}\` (${size} inches)`, page: "Fun" })] });
  },
};
