import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "unlockdown",
  description: "Unlock a locked channel.",
  category: "moderation",
  aliases: ["unlock", "unlockch"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Channel to unlock", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = (ctx.getChannel ? ctx.getChannel("channel") : null) ?? ctx.channel as any;
    if (!ch?.permissionOverwrites) return ctx.reply({ content: "Invalid channel.", ephemeral: true } as any);
    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null }, { reason: `Unlocked by ${ctx.user.tag}` });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("🔓 Channel Unlocked").setDescription(`<#${ch.id}> has been unlocked.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
