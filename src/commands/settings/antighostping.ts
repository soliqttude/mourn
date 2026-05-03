import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
export const command: HybridCommand = {
  name: "antighostping", aliases: ["ghostping"], description: "Toggle anti-ghost-ping detection.", category: "settings", permission: "admin", guildOnly: true,
  options: [{ name: "action", description: "enable or disable", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "enable", value: "enable" }, { name: "disable", value: "disable" }] }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = ctx.getString("action", true) ?? ctx.args[0];
    const enabled = action === "enable";
    await updateGuildSettings(ctx.guild.id, { antighostpingEnabled: enabled } as any);
    return ctx.reply({ embeds: [successEmbed(`Anti-ghost-ping is now **${enabled ? "enabled ✅" : "disabled ❌"}**. ${enabled ? "I'll alert when someone pings and deletes their message." : ""}`)] });
  },
};
