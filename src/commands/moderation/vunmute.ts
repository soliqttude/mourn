import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "vunmute",
  aliases: ["voiceunmute", "vcunmute"],
  description: "Remove server-mute from a member.",
  usage: "vunmute [user]",
  examples: ["vunmute"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [{ name: "user", description: "Member to unmute", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (!target.voice.channel) return ctx.reply({ embeds: [errorEmbed("**Member** is not in a voice **channel**.")] });
    await target.voice.setMute(false);
    return ctx.reply({ embeds: [successEmbed(`Voice-unmuted **${target.user.tag}**.`)] });
  },
};
