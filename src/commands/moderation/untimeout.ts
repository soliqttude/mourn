import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "unmute",
  aliases: ["untimeout"],
  description: "Remove a member timeout. Also available as untimeout.",
  usage: "unmute <member> [reason]",
  examples: ["unmute @member"],
  category: "moderation",
  permission: "moderate_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to unmute", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (!target.communicationDisabledUntilTimestamp) {
      return ctx.reply({ embeds: [errorEmbed(`**${target.user.tag}** is not currently timed out.`)] });
    }
    const reason = (ctx.getString("reason") ?? ctx.args.slice(1).join(" ")) || "No reason provided";
    if (!target.moderatable) return ctx.reply({ embeds: [errorEmbed("I cannot remove this member's timeout. Check my role hierarchy.")] });
    try {
      await target.timeout(null, `Timeout removed by ${ctx.user.tag}: ${reason}`);
      return ctx.reply({ embeds: [successEmbed(`Removed timeout from **${target.user.tag}**.`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message || "Failed to remove timeout.")] });
    }
  },
};
