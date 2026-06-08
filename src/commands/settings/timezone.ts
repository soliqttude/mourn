import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "settimezone",
  description: "Set the server timezone.",
  category: "settings",
  aliases: ["servertimezone", "guiltz"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "timezone", description: "Timezone (e.g. America/New_York)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const tz = ctx.getString("timezone") ?? ctx.args[0];
    if (!tz) return ctx.reply({ content: "Provide a timezone.", ephemeral: true } as any);
    try { Intl.DateTimeFormat(undefined, { timeZone: tz }); } catch { return ctx.reply({ content: "Invalid timezone. Use IANA format (e.g. America/New_York).", ephemeral: true } as any); }
    await updateGuildSettings(ctx.guild.id, { timezone: tz } as any);
    const now = new Date().toLocaleString("en-US", { timeZone: tz });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Server timezone set to **${tz}**.\nCurrent time: **${now}**`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
