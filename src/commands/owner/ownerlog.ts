import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { ownerState } from "../../lib/ownerState.js";

export const command: HybridCommand = {
  name: "ownerlog",
  description: "(Owner only) View recent bot errors sent to your DMs.",
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const errors = ownerState.errorLog.slice(0, 10);
    if (!errors.length) return ctx.reply({ content: "No errors logged. 🎉" });
    try {
      const dmChannel = await ctx.user.createDM();
      for (const err of errors) {
        const eb = new EmbedBuilder()
          .setColor(config.errorColor)
          .setTitle("⚠️ Error Entry")
          .setDescription(`**${err.message}**\n\`\`\`${(err.stack ?? "No stack trace").slice(0, 900)}\`\`\``)
          .setTimestamp(err.timestamp)
          .setFooter({ text: config.embedFooter });
        await dmChannel.send({ embeds: [eb] });
      }
      return ctx.reply({ content: `Sent ${errors.length} error(s) to your DMs.`, ephemeral: true });
    } catch {
      return ctx.reply({ content: "Could not DM you — check your privacy settings." });
    }
  },
};
