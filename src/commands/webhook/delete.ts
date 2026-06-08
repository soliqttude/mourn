import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "webhookdelete",
  description: "Delete a webhook by ID.",
  category: "webhook",
  aliases: ["deletewebhook"],
  guildOnly: true,
  userPermissions: ["ManageWebhooks"],
  options: [{ name: "id", description: "Webhook ID", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const id = ctx.getString("id") ?? ctx.args[0];
    if (!id) return ctx.reply({ content: "Provide webhook ID.", ephemeral: true } as any);
    const wh = await ctx.client.fetchWebhook(id).catch(() => null);
    if (!wh || wh.guildId !== ctx.guild.id) return ctx.reply({ content: "Webhook not found in this server.", ephemeral: true } as any);
    await wh.delete(`Deleted by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Webhook **${wh.name}** deleted.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
