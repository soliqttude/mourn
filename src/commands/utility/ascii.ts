import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "ascii", aliases: ["figlet"], description: "Convert text to ASCII art.", category: "utility",
  options: [{ name: "text", description: "Text to convert (max 8 chars)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = (ctx.getString("text", true) ?? ctx.rawArgs).slice(0, 8).toUpperCase();
    if (!text) return ctx.reply({ embeds: [errorEmbed("Provide some text (max 8 characters).")] });
    try {
      const res = await fetch(`https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}&font=banner3`, { headers: { "User-Agent": "mourn-bot/1.0" } });
      if (!res.ok) throw new Error("artii unavailable");
      const art = await res.text();
      return ctx.reply({ embeds: [brandEmbed({ title: "🎨 ASCII Art", description: `\`\`\`\n${art.slice(0, 1900)}\n\`\`\``, page: "ASCII" })] });
    } catch {
      return ctx.reply({ embeds: [brandEmbed({ title: "🎨 ASCII Art", description: `**${text.split("").join("  ")}**`, page: "ASCII" })] });
    }
  },
};
