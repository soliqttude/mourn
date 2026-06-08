import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "lockdown",
  description: "Lock a channel, preventing members from sending messages.",
  category: "moderation",
  aliases: ["lock", "lockch"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Channel to lock", type: ApplicationCommandOptionType.Channel, required: false }, { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = (ctx.getChannel ? ctx.getChannel("channel") : null) ?? ctx.channel as any;
    const reason = ctx.getString("reason") ?? ctx.args.join(" ") ?? "No reason provided.";
    if (!ch?.permissionOverwrites) return ctx.reply({ content: "Invalid channel.", ephemeral: true } as any);
    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false }, { reason: `Locked by ${ctx.user.tag}: ${reason}` });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🔒 Channel Locked").setDescription(`<#${ch.id}> has been locked.\n**Reason:** ${reason}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
