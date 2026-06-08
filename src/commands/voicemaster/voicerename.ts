import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "voicerename",
  description: "Rename a voice channel.",
  category: "voicemaster",
  aliases: ["renamevc"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Voice channel", type: ApplicationCommandOptionType.Channel, required: true }, { name: "name", description: "New name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") as any : null;
    const name = ctx.getString("name") ?? ctx.args[1];
    if (!ch || !name) return ctx.reply({ content: "Provide channel and name.", ephemeral: true } as any);
    await ch.setName(name, `Renamed by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Renamed to **${name}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
