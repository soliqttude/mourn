import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "hidechannel",
  description: "Hide a channel from regular members.",
  category: "moderation",
  aliases: ["hide", "hc"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Channel to hide", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = (ctx.getChannel ? ctx.getChannel("channel") : null) ?? ctx.channel as any;
    if (!ch?.permissionOverwrites) return ctx.reply({ content: "Invalid channel.", ephemeral: true } as any);
    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { ViewChannel: false }, { reason: `Hidden by ${ctx.user.tag}` });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`🙈 <#${ch.id}> is now hidden from everyone.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
