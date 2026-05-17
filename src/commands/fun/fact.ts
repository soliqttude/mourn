import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import https from "https";

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: "application/json" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { reject(new Error("parse")); } });
    }).on("error", reject);
  });
}

export const command: HybridCommand = {
  name: "fact",
  aliases: ["funfact", "randomfact"],
  description: "Get a random fun fact.",
  usage: "fact",
  examples: ["fact"],
  category: "fun",
  guildOnly: false,
  options: [],
  async execute(ctx) {
    try {
      const data = await fetchJSON("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
      const fact: string = data?.text;
      if (!fact) throw new Error("no fact");
      return ctx.reply({ embeds: [brandEmbed({ title: "💡 Random Fact", description: fact, page: "Fun" })] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Couldn't fetch a fact right now. Try again!")] });
    }
  },
};
