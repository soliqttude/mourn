import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
function regional(t: string): string {
  return t.toLowerCase().split("").map(c => {
    if (c >= "a" && c <= "z") return `:regional_indicator_${c}:`;
    if (c === " ") return "  ";
    if (c >= "0" && c <= "9") return `${c}️⃣`;
    return c;
  }).join(" ");
}
export const command: HybridCommand = {
  name: "regional",
  aliases: ["letters", "bigletters"], description: "Convert text to regional indicator emojis.", category: "fun",
  options: [{ name: "text", description: "Text to convert", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return ctx.reply({ embeds: [errorEmbed("Please provide some text.")] });
    return ctx.reply({ embeds: [brandEmbed({ description: regional(text.slice(0, 50)), page: "Fun" })] });
  },
};
