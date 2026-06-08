import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "webhooksend",
  description: "Send a message through a webhook.",
  category: "webhook",
  aliases: ["wh send"],
  guildOnly: true,
  userPermissions: ["ManageWebhooks"],
  options: [
    { name: "id", description: "Webhook ID", type: ApplicationCommandOptionType.String, required: true },
    { name: "message", description: "Message content", type: ApplicationCommandOptionType.String, required: true },
    { name: "username", description: "Override username", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const id = ctx.getString("id") ?? ctx.args[0];
    const message = ctx.getString("message") ?? ctx.args.slice(1).join(" ");
    const username = ctx.getString("username") ?? undefined;
    if (!id || !message) return ctx.reply({ content: "Provide webhook ID and message.", ephemeral: true } as any);
    const wh = await ctx.client.fetchWebhook(id).catch(() => null);
    if (!wh || wh.guildId !== ctx.guild.id) return ctx.reply({ content: "Webhook not found.", ephemeral: true } as any);
    await wh.send({ content: message, username }).catch((e: Error) => ctx.reply({ content: `Failed: ${e.message}`, ephemeral: true } as any));
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Message sent via **${wh.name}**.`).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
