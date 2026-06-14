import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "voicekick",
  description: "Kick a member from their voice channel.",
  usage: "voicekick [user]",
  examples: ["voicekick"],
  category: "moderation",
  permission: "move_members",
  guildOnly: true,
  aliases: ["vkick"],
  options: [{ name: "user", description: "Member to kick from VC", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (!target.voice.channel) return ctx.reply({ embeds: [errorEmbed("**Member** is not in a voice **channel**.")] });
    await target.voice.disconnect();
    return ctx.reply({ embeds: [successEmbed(`Kicked **${target.user.tag}** from voice.`)] });
  },
};
