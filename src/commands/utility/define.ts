import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "define",
  description: "Get the definition of a word.",
  category: "utility",
  aliases: ["dictionary", "dict", "definition"],
  options: [{ name: "word", description: "Word to define", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const word = ctx.getString("word") ?? ctx.args[0];
    if (!word) return ctx.reply({ content: "Provide a word.", ephemeral: true } as any);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const data = await res.json() as any;
      if (!Array.isArray(data)) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`No definition found for **${word}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
      const entry = data[0];
      const meaning = entry.meanings[0];
      const def = meaning.definitions[0];
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📖 ${entry.word}`).addFields({ name: meaning.partOfSpeech, value: def.definition },{ name: "Example", value: def.example ?? "N/A" },{ name: "Synonyms", value: (def.synonyms ?? []).slice(0,5).join(", ") || "None" }).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`Could not find definition for **${word}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
