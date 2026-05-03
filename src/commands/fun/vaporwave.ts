import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
function vwave(t: string): string {
  return t.split("").map(c => {
    const n = c.charCodeAt(0);
    if (n >= 33 && n <= 126) return String.fromCharCode(n + 65248);
    if (c === " ") return "\u3000";
    return c;
  }).join("");
}
export const command: HybridCommand = {
  name: "vaporwave", aliases: ["aesthetic", "ae"], description: "Convert text to vaporwave aesthetic.", category: "fun",
  options: [{ name: "text", description: "Text to convert", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return ctx.reply({ embeds: [errorEmbed("Please provide some text.")] });
    return ctx.reply({ embeds: [brandEmbed({ description: vwave(text.slice(0, 200)), page: "Fun" })] });
  },
};
