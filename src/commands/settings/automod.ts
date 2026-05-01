import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "automod",
  description: "Toggle automod features.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "feature", description: "automod | links | invites", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "on | off", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const feature = (ctx.getString("feature", true) ?? "").toLowerCase();
    const v = (ctx.getString("value", true) ?? "").toLowerCase();
    const enabled = ["on", "true", "yes", "enable", "enabled"].includes(v);
    const patch: Record<string, boolean> = {};
    if (feature === "automod") patch.automodEnabled = enabled;
    else if (feature === "links") patch.linkFilterEnabled = enabled;
    else if (feature === "invites") patch.inviteFilterEnabled = enabled;
    else return ctx.reply({ embeds: [errorEmbed("Unknown feature.")] });
    await updateGuildSettings(ctx.guild.id, patch);
    const s = await getGuildSettings(ctx.guild.id);
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Automod",
          description: `Updated **${feature}** → ${enabled ? "✅ on" : "❌ off"}`,
          fields: [
            { name: "Automod", value: s.automodEnabled ? "on" : "off", inline: true },
            { name: "Link filter", value: s.linkFilterEnabled ? "on" : "off", inline: true },
            { name: "Invite filter", value: s.inviteFilterEnabled ? "on" : "off", inline: true },
          ],
          page: "Automod",
        }),
      ],
    });
  },
};
