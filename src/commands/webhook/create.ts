import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "webhookcreate",
  description: "Create a webhook in the current channel.",
  category: "webhook",
  aliases: ["createwebhook", "wh create"],
  guildOnly: true,
  userPermissions: ["ManageWebhooks"],
  options: [
    { name: "name", description: "Webhook name", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = ctx.getString("name") ?? ctx.args[0];
    if (!name) return ctx.reply({ content: "Provide a name.", ephemeral: true } as any);
    const ch = (ctx.getChannel ? ctx.getChannel("channel") : null) ?? ctx.channel as any;
    if (!ch?.createWebhook) return ctx.reply({ content: "Invalid channel.", ephemeral: true } as any);
    const wh = await ch.createWebhook({ name, reason: `Created by ${ctx.user.tag}` }).catch((e: Error) => e);
    if (wh instanceof Error) return ctx.reply({ content: `Failed: ${wh.message}`, ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Webhook Created").addFields({ name: "Name", value: (wh as any).name, inline: true },{ name: "Channel", value: `<#${ch.id}>`, inline: true }).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
