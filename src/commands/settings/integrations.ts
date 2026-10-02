import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getIntegrationStatuses, integrationEnvHelp, configuredIntegrationCount } from "../../lib/integrations.js";

export const command: HybridCommand = {
  name: "integrations",
  aliases: ["integrationstatus", "apis"],
  description: "View integration and API configuration status.",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  async execute(ctx) {
    const statuses = getIntegrationStatuses();
    const lines = statuses.map(s => `${s.configured ? "✅" : "⚪"} **${s.name}** — ${s.detail}${s.configured ? "" : ` · ${integrationEnvHelp(s.name) ?? "no credentials required"}`}`);
    const dbLine = config.databaseEnabled ? `✅ PostgreSQL enabled · pool ${config.database.maxConnections}` : "⚪ PostgreSQL disabled";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.brandColor).setTitle("🔌 Mourn Integrations").setDescription(lines.join("\n")).addFields({ name: "Configured", value: `${configuredIntegrationCount()}/${statuses.length}`, inline: true }, { name: "Database", value: dbLine, inline: true }, { name: "Polling", value: `${Math.round(config.integrationPollIntervalMs / 1000)}s`, inline: true }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};