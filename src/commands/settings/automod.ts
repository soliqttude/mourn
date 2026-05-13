import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "automod",
  description: "Toggle automod features. ,automod | ,automod links | ,automod invites",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "feature", description: "Which feature to toggle: links | invites (blank = main automod)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const feature = (ctx.getString("feature") ?? ctx.args[0] ?? "").toLowerCase().trim();
    const settings = await getGuildSettings(ctx.guild.id);

    if (feature === "links") {
      const enabled = !settings.linkFilterEnabled;
      await updateGuildSettings(ctx.guild.id, { linkFilterEnabled: enabled });
      const s = await getGuildSettings(ctx.guild.id);
      return ctx.reply({ embeds: [status(s, `Link filter → **${enabled ? "on" : "off"}**`)] });
    }

    if (feature === "invites") {
      const enabled = !settings.inviteFilterEnabled;
      await updateGuildSettings(ctx.guild.id, { inviteFilterEnabled: enabled });
      const s = await getGuildSettings(ctx.guild.id);
      return ctx.reply({ embeds: [status(s, `Invite filter → **${enabled ? "on" : "off"}**`)] });
    }

    // blank = toggle main automod
    const enabled = !settings.automodEnabled;
    await updateGuildSettings(ctx.guild.id, { automodEnabled: enabled });
    const s = await getGuildSettings(ctx.guild.id);
    return ctx.reply({ embeds: [status(s, `Automod → **${enabled ? "on" : "off"}**`)] });
  },
};

function status(s: Awaited<ReturnType<typeof import("../../db/settings.js").getGuildSettings>>, changed: string) {
  return brandEmbed({
    title: "Automod",
    description: changed,
    fields: [
      { name: "automod",      value: s.automodEnabled      ? "on" : "off", inline: true },
      { name: "link filter",  value: s.linkFilterEnabled    ? "on" : "off", inline: true },
      { name: "invite filter",value: s.inviteFilterEnabled  ? "on" : "off", inline: true },
    ],
    page: "Automod",
  });
}
