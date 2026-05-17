import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "drag",
  aliases: ["movemember", "move"],
  description: "Move a member to a different voice channel.",
  usage: "drag [user] [channel]",
  examples: ["drag"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to move", type: ApplicationCommandOptionType.User, required: true },
    { name: "channel", description: "Target voice channel", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (!target.voice.channel) return ctx.reply({ embeds: [errorEmbed("Member is not in a voice channel.")] });
    const channel = ctx.getChannel("channel");
    if (!channel) return ctx.reply({ embeds: [errorEmbed("Channel not found.")] });
    const vc = ctx.guild.channels.cache.get(channel.id);
    if (!vc || (vc.type !== ChannelType.GuildVoice && vc.type !== ChannelType.GuildStageVoice)) {
      return ctx.reply({ embeds: [errorEmbed("That is not a voice channel.")] });
    }
    await target.voice.setChannel(vc as any);
    return ctx.reply({ embeds: [successEmbed(`Moved **${target.user.tag}** to **${vc.name}**.`)] });
  },
};
