import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "prefix",
  description: "View or change the server prefix.",
  usage: "prefix [new_prefix]",
  examples: ["prefix"],
  category: "settings",
  guildOnly: true,
  options: [
    { name: "new_prefix", description: "New prefix (1-5 chars)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const newPrefix = ctx.getString("new_prefix");
    if (!newPrefix) {
      const s = await getGuildSettings(ctx.guild.id);
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "Prefix",
            description: `Current prefix: \`${s.prefix}\``,
            page: "Settings",
          }),
        ],
      });
    }
    const { checkTier } = await import("../../lib/permissions.js");
    if (!ctx.member || !checkTier(ctx.member, "admin")) {
      return ctx.reply({ embeds: [errorEmbed("Only admins can change the prefix.")] });
    }
    if (newPrefix.length < 1 || newPrefix.length > 5) {
      return ctx.reply({ embeds: [errorEmbed("Prefix must be 1-5 characters.")] });
    }
    await updateGuildSettings(ctx.guild.id, { prefix: newPrefix });
    return ctx.reply({ embeds: [successEmbed(`Prefix set to \`${newPrefix}\`.`)] });
  },
};
