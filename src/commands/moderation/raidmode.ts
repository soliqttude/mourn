import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
export const command: HybridCommand = {
  name: "raidmode", aliases: ["antiraid"], description: "Toggle raid mode on or off.", category: "moderation", permission: "admin", guildOnly: true,
  options: [{ name: "action", description: "on or off", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "on", value: "on" }, { name: "off", value: "off" }] }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "").toLowerCase();
    if (!action) return ctx.reply({ embeds: [errorEmbed("Please specify `on` or `off`.")] });
    const enabled = action === "on" || action === "enable";
    await updateGuildSettings(ctx.guild.id, { antiraidEnabled: enabled });
    return ctx.reply({ embeds: [successEmbed(`Raid mode is now **${enabled ? "🔴 ON" : "🟢 OFF"}**.${enabled ? " The bot will monitor new joins closely." : ""}`)] });
  },
};
