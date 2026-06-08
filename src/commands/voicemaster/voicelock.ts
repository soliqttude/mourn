import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "voicelock",
  description: "Lock a voice channel.",
  category: "voicemaster",
  aliases: ["lockvc"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Voice channel to lock", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = (ctx.getChannel ? ctx.getChannel("channel") as any : null) ?? (ctx.guild.members.cache.get(ctx.user.id) as any)?.voice?.channel;
    if (!ch) return ctx.reply({ content: "Provide a channel or join one.", ephemeral: true } as any);
    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { Connect: false }, { reason: `Locked by ${ctx.user.tag}` });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`🔒 **${ch.name}** locked.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
