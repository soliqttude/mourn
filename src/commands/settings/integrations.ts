import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getIntegrationStatuses, integrationEnvHelp } from "../../lib/integrations.js";

export const command: HybridCommand = {
  name: "integrations",
  aliases: ["integrationstatus", "apis"],
  description: "View integration and API configuration status.",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  async execute(ctx) {
    const statuses = getIntegrationStatuses();
    const lines = statuses.map(s => `${s.configured ? "✅" : "⚪"} **${s.name}** — ${s.detail}${s.configured ? "" : ` · set ${integrationEnvHelp(s.name) ?? "the required environment variable"}`}`);
    const dbLine = config.databaseEnabled ? `✅ PostgreSQL enabled · pool ${config.database.maxConnections}` : "⚪ PostgreSQL disabled";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.brandColor).setTitle("🔌 Mourn Integrations").setDescription(lines.join("\n")).addFields({ name: "Database", value: dbLine }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};