import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "mock",
  description: "Mock someone with SpOnGeBoB text.",
  category: "fun",
  options: [{ name: "text", description: "Text to mock", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return;
    const mocked = [...text].map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join("");
    return ctx.reply({ embeds: [brandEmbed({ title: "🧽 mOcKeD", description: mocked, page: "Fun" })] });
  },
};
