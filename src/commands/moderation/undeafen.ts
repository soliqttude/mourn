import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "undeafen",
  description: "Remove server-deafen from a member.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [{ name: "user", description: "Member to undeafen", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (!target.voice.channel) return ctx.reply({ embeds: [errorEmbed("Member is not in a voice channel.")] });
    await target.voice.setDeaf(false);
    return ctx.reply({ embeds: [successEmbed(`Undeafened **${target.user.tag}**.`)] });
  },
};
