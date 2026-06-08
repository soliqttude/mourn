import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setlogs",
  description: "Set the logging channel.",
  category: "config",
  aliases: ["logchannel", "auditlogs"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "channel", description: "Log channel", type: ApplicationCommandOptionType.Channel, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") : null;
    const channelId = (ch as any)?.id ?? ctx.args[0]?.replace(/[<#>]/g,"");
    if (!channelId) return ctx.reply({ content: "Provide a channel.", ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { logChannelId: channelId });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Log channel set to <#${channelId}>.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
