import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
export const command: HybridCommand = {
  name: "antispam",
  aliases: ["spamprotect", "aspam"],
  description: "Toggle antispam on/off. Run with no args to toggle, or pass `status` to check.",
  usage: "antispam [action]",
  examples: ["antispam"],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [
    {
      name: "action",
      description: "status (optional — leave blank to toggle)",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [{ name: "status", value: "status" }],
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const s = await getGuildSettings(ctx.guild.id);

    if (action === "status") {
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "🛡️ Antispam Status",
            fields: [
              { name: "Automod",       value: s.automodEnabled      ? "✅ Enabled" : "❌ Disabled", inline: true },
              { name: "Link Filter",   value: s.linkFilterEnabled    ? "✅" : "❌",                  inline: true },
              { name: "Invite Filter", value: s.inviteFilterEnabled  ? "✅" : "❌",                  inline: true },
            ],
            page: "Antispam",
          }),
        ],
      });
    }

    const enabled = !s.automodEnabled;
    await updateGuildSettings(ctx.guild.id, { automodEnabled: enabled });
    return ctx.reply({
      embeds: [successEmbed(`Antispam is now **${enabled ? "enabled ✅" : "disabled ❌"}**.`)],
    });
  },
};
