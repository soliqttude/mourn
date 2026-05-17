import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { ownerState } from "../../lib/ownerState.js";

export const command: HybridCommand = {
  name: "ghost",
  description: "(Owner only) Toggle ghost mode — bot ignores everyone except you.",
  usage: "ghost",
  examples: ["ghost"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    ownerState.ghostMode = !ownerState.ghostMode;
    const eb = new EmbedBuilder()
      .setColor(ownerState.ghostMode ? 0x2b2d31 : config.successColor)
      .setTitle(ownerState.ghostMode ? "👻 Ghost Mode — ON" : "👁️ Ghost Mode — OFF")
      .setDescription(ownerState.ghostMode
        ? "Bot is now invisible. Only you can interact with it."
        : "Bot is back online for everyone.")
      .setFooter({ text: config.embedFooter })
      .setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
