import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "prefix",
  description: "View or manage this server's command prefix.",
  usage: "prefix | prefix set <prefix> | prefix remove",
  examples: ["prefix", "prefix set !", "prefix remove"],
  category: "settings",
  guildOnly: true,
  options: [
    { name: "action", description: "set | remove", type: ApplicationCommandOptionType.String, required: false, choices: [
      { name: "set", value: "set" }, { name: "remove", value: "remove" },
    ] },
    { name: "prefix", description: "New command prefix", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return ctx.reply({ embeds: [errorEmbed("Use this command in a server.")] });
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const value = ctx.getString("prefix") ?? ctx.args[1] ?? "";
    const settings = await getGuildSettings(ctx.guild.id);

    if (!action) {
      return ctx.reply({ embeds: [brandEmbed({ title: "Server Prefix", description: "Current prefix: " + (settings.prefix || config.defaultPrefix) })] });
    }

    if (!ctx.member || !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ embeds: [errorEmbed("You need Administrator to change the server prefix.")] });
    }

    if (action === "remove") {
      await updateGuildSettings(ctx.guild.id, { prefix: config.defaultPrefix });
      return ctx.reply({ embeds: [successEmbed("Server prefix reset to " + config.defaultPrefix + ".")] });
    }

    if (action === "set") {
      if (!value || value.length > 5 || /\s/.test(value)) {
        return ctx.reply({ embeds: [errorEmbed("Provide a prefix from 1–5 characters with no spaces.")] });
      }
      await updateGuildSettings(ctx.guild.id, { prefix: value });
      return ctx.reply({ embeds: [successEmbed("Server prefix set to " + value + ".")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Use prefix, prefix set <prefix>, or prefix remove.")] });
  },
};
