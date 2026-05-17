import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { ownerState } from "../../lib/ownerState.js";

export const command: HybridCommand = {
  name: "spy",
  description: "(Owner only) View recent commands run across all servers.",
  usage: "spy",
  examples: ["spy"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const logs = ownerState.commandLog.slice(0, 25);
    if (!logs.length) return ctx.reply({ content: "No commands logged yet." });
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle("🕵️ Command Spy — Last 25")
      .setDescription(logs.map((l, i) =>
        `\`${i + 1}\` **${l.command}** by \`${l.username}\` in **${l.guildName}** <t:${Math.floor(l.timestamp.getTime() / 1000)}:R>`
      ).join("\n"))
      .setFooter({ text: `${ownerState.commandLog.length} total logged • ${config.embedFooter}` })
      .setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
