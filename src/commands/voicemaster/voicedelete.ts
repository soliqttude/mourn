import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "voicedelete",
  description: "Delete a voice channel.",
  category: "voicemaster",
  aliases: ["deletevc"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Voice channel to delete", type: ApplicationCommandOptionType.Channel, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") as any : null;
    if (!ch || ch.type !== ChannelType.GuildVoice) return ctx.reply({ content: "Provide a voice channel.", ephemeral: true } as any);
    await ch.delete(`Deleted by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Voice channel deleted.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
