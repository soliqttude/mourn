import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "roll",
  description: "Roll a dice. Optionally specify sides (default 6).",
  category: "fun",
  aliases: ["dice"],
  options: [{ name: "sides", description: "Number of sides (default 6)", type: ApplicationCommandOptionType.Integer, required: false }],
  async execute(ctx) {
    const sides = (ctx.getNumber("sides") ?? parseInt(ctx.args[0])) || 6;
    if (sides < 2 || sides > 1000) return ctx.reply({ embeds: [errorEmbed("Sides must be between 2 and 1000.")] });
    const result = Math.floor(Math.random() * sides) + 1;
    return ctx.reply({ embeds: [brandEmbed({ title: `🎲 d${sides}`, description: `You rolled **${result}**!`, page: "Fun" })] });
  },
};
