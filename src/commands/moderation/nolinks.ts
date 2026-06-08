import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "nolinks",
  description: "Prevent members from sending links in a channel.",
  category: "moderation",
  aliases: ["antilinks", "blocklinks"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Channel", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = (ctx.getChannel ? ctx.getChannel("channel") : null) ?? ctx.channel as any;
    if (!ch?.permissionOverwrites) return ctx.reply({ content: "Invalid channel.", ephemeral: true } as any);
    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { EmbedLinks: false, AddReactions: null }, { reason: `No links by ${ctx.user.tag}` });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`🚫 Links disabled in <#${ch.id}>.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
