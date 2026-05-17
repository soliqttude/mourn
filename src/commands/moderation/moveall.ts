import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "moveall",
  aliases: ["mvall", "massMove"],
  description: "Move all members from one voice channel to another.",
  usage: "moveall [from] [to]",
  examples: ["moveall"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "from", description: "Source voice channel", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "to", description: "Target voice channel", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const fromCh = ctx.getChannel("from");
    const toCh = ctx.getChannel("to");
    if (!fromCh || !toCh) return ctx.reply({ embeds: [errorEmbed("Provide both voice channels.")] });
    const from = ctx.guild.channels.cache.get(fromCh.id);
    const to = ctx.guild.channels.cache.get(toCh.id);
    if (!from || from.type !== ChannelType.GuildVoice) return ctx.reply({ embeds: [errorEmbed("Source must be a voice channel.")] });
    if (!to || to.type !== ChannelType.GuildVoice) return ctx.reply({ embeds: [errorEmbed("Target must be a voice channel.")] });
    const members = (from as any).members;
    let count = 0;
    for (const [, member] of members) {
      await member.voice.setChannel(to).catch(() => {});
      count++;
    }
    return ctx.reply({ embeds: [successEmbed(`Moved **${count}** members from **${from.name}** to **${to.name}**.`)] });
  },
};
