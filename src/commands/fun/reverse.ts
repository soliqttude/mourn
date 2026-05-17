import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "reverse",
  aliases: ["rev", "backwards"],
  description: "Reverse some text.",
  category: "fun",
  options: [{ name: "text", description: "Text to reverse", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return;
    const reversed = [...text].reverse().join("");
    return ctx.reply({ embeds: [brandEmbed({ title: "🔄 Reversed", description: reversed, page: "Fun" })] });
  },
};
