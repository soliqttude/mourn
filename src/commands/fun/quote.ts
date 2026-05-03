import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "quote", description: "Get a random inspirational quote.", category: "fun",
  async execute(ctx) {
    try {
      const res = await fetch("https://zenquotes.io/api/random", { headers: { "User-Agent": "mourn-bot/1.0" } });
      const data = await res.json() as { q: string; a: string }[];
      const q = data[0];
      if (!q?.q) throw new Error("empty");
      return ctx.reply({ embeds: [brandEmbed({ title: "💬 Quote", description: `*"${q.q}"*\n\n— **${q.a}**`, page: "Fun" })] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Could not fetch a quote right now. Try again later.")] });
    }
  },
};
