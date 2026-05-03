import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
function owoify(t: string): string {
  const suffixes = ["OwO", "UwU", "Uwu", "OwU", "^w^", "~ nya~", "rawr~"];
  return t
    .replace(/r|l/g, "w").replace(/R|L/g, "W")
    .replace(/n([aeiou])/g, "ny$1").replace(/N([AEIOU])/g, "Ny$1")
    .replace(/th/g, "d").replace(/ove/g, "uv")
    + " " + suffixes[Math.floor(Math.random() * suffixes.length)]!;
}
export const command: HybridCommand = {
  name: "owoify", aliases: ["owo"], description: "Convert text to OwO speak.", category: "fun",
  options: [{ name: "text", description: "Text to owoify", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return ctx.reply({ embeds: [errorEmbed("Please provide some text.")] });
    return ctx.reply({ embeds: [brandEmbed({ description: owoify(text.slice(0, 500)), page: "Fun" })] });
  },
};
