import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "voicemove",
  description: "Move a user to a different voice channel.",
  category: "voicemaster",
  aliases: ["vcmove", "movevc"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "user", description: "User to move", type: ApplicationCommandOptionType.User, required: true }, { name: "channel", description: "Target voice channel", type: ApplicationCommandOptionType.Channel, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const ch = ctx.getChannel ? ctx.getChannel("channel") as any : null;
    if (!target || !ch) return ctx.reply({ content: "Provide user and channel.", ephemeral: true } as any);
    const member = await ctx.guild.members.fetch(target.id).catch(() => null);
    if (!member?.voice.channel) return ctx.reply({ content: "User is not in a voice channel.", ephemeral: true } as any);
    await member.voice.setChannel(ch.id, `Moved by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Moved **${target.username}** to **${ch.name}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
