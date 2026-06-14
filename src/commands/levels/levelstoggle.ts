import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { updateGuildSettings, getGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "levelstoggle",
  description: "Toggle the leveling system on or off.",
  usage: "levelstoggle",
  examples: ["levelstoggle"],
  category: "levels",
  permission: "manage_guild",
  guildOnly: true,
  aliases: ["togglelevels"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const settings = await getGuildSettings(ctx.guild.id);
    const newVal = !settings.levelsEnabled;
    await updateGuildSettings(ctx.guild.id, { levelsEnabled: newVal });
    return ctx.reply({ embeds: [successEmbed(`Leveling system is now **${newVal ? "enabled" : "disabled"}**.`)] });
  },
};
