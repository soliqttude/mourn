import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "dadjoke",
  description: "Get a random dad joke.",
  usage: "dadjoke",
  examples: ["dadjoke"],
  category: "fun",
  aliases: ["dad"],
  async execute(ctx) {
    try {
      const res = await fetch("https://icanhazdadjoke.com/", { headers: { Accept: "application/json" } });
      const data = await res.json() as { joke: string };
      return ctx.reply({ embeds: [brandEmbed({ title: "Dad Joke 😂", description: data.joke, page: "Fun" })] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Couldn't fetch a joke right now.")] });
    }
  },
};
