import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "define", aliases: ["dictionary", "dict"], description: "Look up the definition of a word.", category: "utility",
  options: [{ name: "word", description: "Word to define", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const word = ctx.getString("word", true) ?? ctx.args[0];
    if (!word) return ctx.reply({ embeds: [errorEmbed("Please provide a word.")] });
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) return ctx.reply({ embeds: [errorEmbed(`No definition found for **${word}**.`)] });
      const data = await res.json() as any[];
      const entry = data[0];
      const fields: { name: string; value: string; inline: boolean }[] = [];
      for (const meaning of (entry.meanings ?? []).slice(0, 3)) {
        const defs = meaning.definitions.slice(0, 2).map((d: any, i: number) =>
          `${i + 1}. ${d.definition}${d.example ? `\n*"${d.example}"*` : ""}`
        ).join("\n");
        fields.push({ name: `📖 ${meaning.partOfSpeech}`, value: defs.slice(0, 1024), inline: false });
      }
      const phonetic = entry.phonetic ?? entry.phonetics?.[0]?.text ?? "";
      return ctx.reply({ embeds: [brandEmbed({ title: `📚 ${entry.word}${phonetic ? ` ${phonetic}` : ""}`, fields, page: "Define" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Could not fetch definition.")] }); }
  },
};
