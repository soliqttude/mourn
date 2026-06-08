import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "notifications",
  description: "Toggle server notification settings.",
  category: "settings",
  aliases: ["notifs", "notifysettings"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "type", description: "join, leave, or levelup", type: ApplicationCommandOptionType.String, required: true }, { name: "enabled", description: "Enable or disable", type: ApplicationCommandOptionType.Boolean, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const type = (ctx.getString("type") ?? ctx.args[0] ?? "").toLowerCase();
    const enabled = ctx.getBoolean ? ctx.getBoolean("enabled") : ctx.args[1] === "true";
    const valid = ["join","leave","levelup"];
    if (!valid.includes(type)) return ctx.reply({ content: "Type must be: join, leave, levelup.", ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { [`notify_${type}`]: enabled } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ **${type}** notifications ${enabled ? "enabled" : "disabled"}.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
