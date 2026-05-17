import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "choose",
  description: "Let the bot choose between options (separate with |).",
  usage: "choose [options]",
  examples: ["choose"],
  category: "fun",
  aliases: ["pick"],
  options: [{ name: "options", description: "Options separated by |", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const input = ctx.getString("options", true) ?? ctx.rawArgs;
    if (!input) return;
    const opts = input.split("|").map(o => o.trim()).filter(Boolean);
    if (opts.length < 2) return ctx.reply({ embeds: [errorEmbed("Provide at least 2 options separated by `|`.")] });
    const chosen = opts[Math.floor(Math.random() * opts.length)];
    return ctx.reply({ embeds: [brandEmbed({ title: "🎯 My choice", description: `**${chosen}**`, page: "Fun" })] });
  },
};
