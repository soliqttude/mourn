import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "webhooklist",
  description: "List all webhooks in the server.",
  category: "webhook",
  aliases: ["listwebhooks", "webhooks"],
  guildOnly: true,
  userPermissions: ["ManageWebhooks"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const hooks = await ctx.guild.fetchWebhooks();
    if (!hooks.size) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("No webhooks found.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    const lines = hooks.map(h => `**${h.name}** — <#${h.channelId}> (`+`${h.id}`+`)`).slice(0,15);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🔗 Webhooks (${hooks.size})`).setDescription(lines.join("\n")).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
