import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "untimeout",
  aliases: ["unmute"],
  description: "Remove a timeout from a member.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    const target = await ctx.getMember("user", true);
    if (!target) return;
    try {
      await target.timeout(null, `Untimeout by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Removed timeout from **${target.user.tag}**.`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
