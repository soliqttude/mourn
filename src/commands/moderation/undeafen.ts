import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "undeafen",
  aliases: ["undeaf", "undv"],
  description: "Remove server-deafen from a member.",
  usage: "undeafen [user]",
  examples: ["undeafen"],
  category: "moderation",
  permission: "deafen_members",
  guildOnly: true,
  options: [{ name: "user", description: "Member to undeafen", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (!target.voice.channel) return ctx.reply({ embeds: [errorEmbed("**Member** is not in a voice **channel**.")] });
    await target.voice.setDeaf(false);
    return ctx.reply({ embeds: [successEmbed(`Undeafened **${target.user.tag}**.`)] });
  },
};
