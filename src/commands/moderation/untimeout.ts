import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "unmute",
  aliases: [],
  description: "Unmute a member.",
  usage: "unmute <member> [reason]",
  examples: ["unmute @mmoudder"],
  category: "moderation",
  permission: "moderate_members",
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
