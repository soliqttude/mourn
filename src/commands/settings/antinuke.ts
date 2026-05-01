import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "antinuke",
  description: "Toggle or configure anti-nuke protection.",
  category: "settings",
  permission: "owner",
  guildOnly: true,
  options: [
    { name: "action", description: "enable | disable | status | action", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "For 'action': ban | kick | strip", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const value = ctx.getString("value");
    const settings = await getGuildSettings(ctx.guild.id);
    if (action === "status") {
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "Anti-Nuke Status",
            fields: [
              { name: "Enabled", value: settings.antinukeEnabled ? "✅" : "❌", inline: true },
              { name: "Action", value: settings.antinukeAction, inline: true },
            ],
            page: "Anti-Nuke",
          }),
        ],
      });
    }
    if (action === "enable") {
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: true });
      return ctx.reply({ embeds: [successEmbed("Anti-nuke **enabled**.")] });
    }
    if (action === "disable") {
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: false });
      return ctx.reply({ embeds: [successEmbed("Anti-nuke **disabled**.")] });
    }
    if (action === "action") {
      if (!value || !["ban", "kick", "strip"].includes(value.toLowerCase())) {
        return ctx.reply({ embeds: [errorEmbed("Value must be: ban, kick, or strip.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antinukeAction: value.toLowerCase() });
      return ctx.reply({ embeds: [successEmbed(`Anti-nuke action set to **${value.toLowerCase()}**.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("Unknown action.")] });
  },
};
