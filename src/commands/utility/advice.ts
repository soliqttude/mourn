import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "advice",
  aliases: ["tip", "suggest"], description: "Get a random piece of advice.", category: "utility",
  async execute(ctx) {
    try {
      const res = await fetch("https://api.adviceslip.com/advice", { headers: { "Cache-Control": "no-cache" } });
      const data = await res.json() as any;
      const text = data.slip?.advice ?? "Be yourself.";
      return ctx.reply({ embeds: [brandEmbed({ title: "💡 Advice", description: `*"${text}"*`, page: "Advice" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Could not fetch advice right now.")] }); }
  },
};
