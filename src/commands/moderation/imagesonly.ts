import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "imagesonly",
  description: "Restrict a channel to images/attachments only.",
  category: "moderation",
  aliases: ["attachonly", "mediaonly"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Channel", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = (ctx.getChannel ? ctx.getChannel("channel") : null) ?? ctx.channel as any;
    if (!ch?.permissionOverwrites) return ctx.reply({ content: "Invalid channel.", ephemeral: true } as any);
    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false, AttachFiles: true }, { reason: `Images only by ${ctx.user.tag}` });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`🖼️ <#${ch.id}> is now images-only.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
