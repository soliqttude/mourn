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
    { name: "user", description: "Member to unmute", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const target = await ctx.getMember("user", true);
    if (!target) return;
    const reason = ctx.getString("reason") ?? "No reason provided";
    try {
      await target.timeout(null, `Untimeout by ${ctx.user.tag}: ${reason}`);
      return ctx.reply({ embeds: [successEmbed(`Removed timeout from **${target.user.tag}**.`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
