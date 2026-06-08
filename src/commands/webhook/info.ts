import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "webhookinfo",
  description: "Get info about a webhook.",
  category: "webhook",
  aliases: ["whinfo"],
  guildOnly: true,
  userPermissions: ["ManageWebhooks"],
  options: [{ name: "id", description: "Webhook ID", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const id = ctx.getString("id") ?? ctx.args[0];
    if (!id) return ctx.reply({ content: "Provide a webhook ID.", ephemeral: true } as any);
    const wh = await ctx.client.fetchWebhook(id).catch(() => null);
    if (!wh || wh.guildId !== ctx.guild.id) return ctx.reply({ content: "Webhook not found.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🔗 Webhook: ${wh.name}`).addFields({ name: "ID", value: wh.id, inline: true },{ name: "Channel", value: `<#${wh.channelId}>`, inline: true },{ name: "Creator", value: wh.owner ? `<@${(wh.owner as any).id}>` : "Unknown", inline: true }).setThumbnail(wh.avatarURL() ?? null).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
