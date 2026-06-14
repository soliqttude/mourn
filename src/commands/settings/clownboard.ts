import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "clownboard",
  aliases: ["clown"],
  description: "Set up a clownboard — like starboard but with 🤡.",
  usage: "clownboard <channel|threshold|disable>",
  examples: ["clownboard #clownboard", "clownboard threshold 5", "clownboard disable"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "channel | threshold | disable", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "channel", value: "channel" }, { name: "threshold", value: "threshold" }, { name: "disable", value: "disable" }] },
    { name: "value", description: "Channel or threshold number", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Clownboard channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "disable") {
      await updateGuildSettings(ctx.guild.id, { clownboardChannel: null });
      return ctx.reply({ embeds: [successEmbed("Clownboard disabled.")] });
    }

    if (sub === "channel") {
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(ctx.args[1]?.replace(/[<#>]/g, "") ?? "");
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Please provide a **channel**.")] });
      await updateGuildSettings(ctx.guild.id, { clownboardChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`clownboard set to <#${ch.id}>. messages that hit the threshold will appear there 🤡.`)] });
    }

    if (sub === "threshold") {
      const val = parseInt(ctx.getString("value") ?? ctx.args[1] ?? "");
      if (isNaN(val) || val < 1 || val > 50) return ctx.reply({ embeds: [errorEmbed("Threshold must be between 1 and 50.")] });
      await updateGuildSettings(ctx.guild.id, { clownboardThreshold: val });
      return ctx.reply({ embeds: [successEmbed(`clownboard threshold set to **${val}** 🤡.`)] });
    }

    const s = await getGuildSettings(ctx.guild.id);
    return ctx.reply({ embeds: [brandEmbed({
      title: "Clownboard",
      fields: [
        { name: "channel", value: (s as any).clownboardChannel ? `<#${(s as any).clownboardChannel}>` : "not set", inline: true },
        { name: "threshold", value: String((s as any).clownboardThreshold ?? 5), inline: true },
      ],
    })] });
  },
};
