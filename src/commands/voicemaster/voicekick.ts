import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "voicekick",
  description: "Kick a user from a voice channel.",
  category: "voicemaster",
  aliases: ["vckick", "disconnectuser"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "user", description: "User to kick from voice", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    if (!target) return ctx.reply({ content: "Provide a user.", ephemeral: true } as any);
    const member = await ctx.guild.members.fetch(target.id).catch(() => null);
    if (!member?.voice.channel) return ctx.reply({ content: "User is not in a voice channel.", ephemeral: true } as any);
    await member.voice.disconnect(`Kicked from VC by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Disconnected **${target.username}** from voice.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
