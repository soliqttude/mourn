import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "urban",
  description: "Look up a word on Urban Dictionary.",
  usage: "urban [word]",
  examples: ["urban"],
  category: "utility",
  aliases: ["ud"],
  options: [{ name: "word", description: "Word to look up", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const word = ctx.getString("word", true) ?? ctx.rawArgs;
    if (!word) return;
    try {
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
      const data = await res.json() as { list: { word: string; definition: string; example: string; thumbs_up: number }[] };
      const entry = data.list?.[0];
      if (!entry) return ctx.reply({ embeds: [errorEmbed(`No definition found for **${word}**.`)] });
      const def = entry.definition.replace(/\[|\]/g, "").slice(0, 1024);
      const ex = entry.example.replace(/\[|\]/g, "").slice(0, 512);
      return ctx.reply({
        embeds: [brandEmbed({
          title: entry.word,
          description: def,
          fields: ex ? [{ name: "Example", value: ex }] : [],
          page: "Urban Dictionary",
        })],
      });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Couldn't reach Urban Dictionary.")] });
    }
  },
};
