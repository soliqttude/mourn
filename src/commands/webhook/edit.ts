import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "webhookedit",
  description: "Edit a webhook's name or avatar.",
  category: "webhook",
  aliases: ["editwebhook"],
  guildOnly: true,
  userPermissions: ["ManageWebhooks"],
  options: [
    { name: "id", description: "Webhook ID", type: ApplicationCommandOptionType.String, required: true },
    { name: "name", description: "New name", type: ApplicationCommandOptionType.String, required: false },
    { name: "avatar", description: "New avatar URL", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const id = ctx.getString("id") ?? ctx.args[0];
    const name = ctx.getString("name") ?? undefined;
    const avatar = ctx.getString("avatar") ?? undefined;
    if (!id) return ctx.reply({ content: "Provide a webhook ID.", ephemeral: true } as any);
    if (!name && !avatar) return ctx.reply({ content: "Provide a new name or avatar URL.", ephemeral: true } as any);
    const wh = await ctx.client.fetchWebhook(id).catch(() => null);
    if (!wh || wh.guildId !== ctx.guild.id) return ctx.reply({ content: "Webhook not found.", ephemeral: true } as any);
    await wh.edit({ name, avatar, reason: `Edited by ${ctx.user.tag}` }).catch((e: Error) => ctx.reply({ content: `Failed: ${e.message}`, ephemeral: true } as any));
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Webhook updated.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
