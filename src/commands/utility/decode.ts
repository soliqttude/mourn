import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "decode",
  aliases: ["dec", "decodetext"],
  description: "Base64 decode text.",
  category: "utility",
  options: [{ name: "text", description: "Base64 text to decode", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return;
    try {
      const decoded = Buffer.from(text, "base64").toString("utf8");
      return ctx.reply({ embeds: [brandEmbed({ title: "🔓 Base64 Decoded", description: `\`\`\`${decoded.slice(0, 1900)}\`\`\``, page: "Utility" })] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Invalid base64 string.")] });
    }
  },
};
