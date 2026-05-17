import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { ownerState } from "../../lib/ownerState.js";

export const command: HybridCommand = {
  name: "maintenance",
  description: "(Owner only) Toggle maintenance mode.",
  usage: "maintenance",
  examples: ["maintenance"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    ownerState.maintenanceMode = !ownerState.maintenanceMode;
    const eb = new EmbedBuilder()
      .setColor(ownerState.maintenanceMode ? 0xff9900 : config.successColor)
      .setTitle(ownerState.maintenanceMode ? "🔧 Maintenance Mode — ON" : "✅ Maintenance Mode — OFF")
      .setDescription(ownerState.maintenanceMode
        ? "Bot is under maintenance. Commands disabled for all regular users."
        : "Bot is back online. All commands restored.")
      .setFooter({ text: config.embedFooter })
      .setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
