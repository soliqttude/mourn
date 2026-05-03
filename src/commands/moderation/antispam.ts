import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
export const command: HybridCommand = {
  name: "antispam", description: "Configure antispam protection.", category: "moderation", permission: "admin", guildOnly: true,
  options: [{ name: "action", description: "enable, disable, or status", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "enable", value: "enable" }, { name: "disable", value: "disable" }, { name: "status", value: "status" }] }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = ctx.getString("action", true) ?? ctx.args[0];
    const s = await getGuildSettings(ctx.guild.id);
    if (action === "status") {
      return ctx.reply({ embeds: [brandEmbed({ title: "🛡️ Antispam Status", fields: [{ name: "Automod", value: s.automodEnabled ? "✅ Enabled" : "❌ Disabled", inline: true }, { name: "Link Filter", value: s.linkFilterEnabled ? "✅" : "❌", inline: true }, { name: "Invite Filter", value: s.inviteFilterEnabled ? "✅" : "❌", inline: true }], page: "Antispam" })] });
    }
    const enabled = action === "enable";
    await updateGuildSettings(ctx.guild.id, { automodEnabled: enabled });
    return ctx.reply({ embeds: [successEmbed(`Antispam is now **${enabled ? "enabled ✅" : "disabled ❌"}**.`)] });
  },
};
