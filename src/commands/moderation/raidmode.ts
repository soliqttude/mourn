import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "raidmode",
  aliases: ["antiraid"],
  description: "Toggle raid mode on/off. Run once to enable, again to disable.",
  usage: "raidmode",
  examples: ["raidmode"],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    if (!ctx.guild) return;
    const settings = await getGuildSettings(ctx.guild.id);
    const enabled = !settings.antiraidEnabled;
    await updateGuildSettings(ctx.guild.id, { antiraidEnabled: enabled });
    return ctx.reply({
      embeds: [successEmbed(`Raid mode is now **${enabled ? "🔴 ON" : "🟢 OFF"}**.${enabled ? " The bot will monitor new joins closely." : ""}`)],
    });
  },
};
