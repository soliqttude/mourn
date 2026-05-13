import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "antighostping",
  aliases: ["ghostping"],
  description: "Toggle anti-ghost-ping detection on/off.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    if (!ctx.guild) return;
    const settings = await getGuildSettings(ctx.guild.id);
    const enabled = !((settings as any).antighostpingEnabled ?? false);
    await updateGuildSettings(ctx.guild.id, { antighostpingEnabled: enabled } as any);
    return ctx.reply({ embeds: [successEmbed(`Anti-ghost-ping is now **${enabled ? "enabled" : "disabled"}**.`)] });
  },
};
