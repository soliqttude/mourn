import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "antiraid",
  description: "Toggle or configure anti-raid protection.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "action", description: "enable | disable | status | threshold | joinage", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "Number for threshold/joinage", type: ApplicationCommandOptionType.Number, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const v = ctx.getNumber("value");
    const settings = await getGuildSettings(ctx.guild.id);
    if (action === "status") {
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "Anti-Raid Status",
            fields: [
              { name: "Enabled", value: settings.antiraidEnabled ? "✅" : "❌", inline: true },
              { name: "Threshold (joins/10s)", value: String(settings.antiraidThreshold), inline: true },
              { name: "Min account age (days)", value: String(settings.antiraidJoinAge), inline: true },
            ],
            page: "Anti-Raid",
          }),
        ],
      });
    }
    if (action === "enable") {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: true });
      return ctx.reply({ embeds: [successEmbed("Anti-raid **enabled**.")] });
    }
    if (action === "disable") {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: false });
      return ctx.reply({ embeds: [successEmbed("Anti-raid **disabled**.")] });
    }
    if (action === "threshold") {
      if (!v || v < 2) return ctx.reply({ embeds: [errorEmbed("Threshold must be ≥ 2.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidThreshold: v });
      return ctx.reply({ embeds: [successEmbed(`Threshold set to **${v}**.`)] });
    }
    if (action === "joinage") {
      if (v === null || v < 0) return ctx.reply({ embeds: [errorEmbed("Joinage must be ≥ 0.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidJoinAge: v });
      return ctx.reply({ embeds: [successEmbed(`Min account age set to **${v}** days.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("Unknown action.")] });
  },
};
