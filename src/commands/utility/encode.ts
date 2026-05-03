import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "encode",
  description: "Base64 encode text.",
  category: "utility",
  options: [{ name: "text", description: "Text to encode", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return;
    const encoded = Buffer.from(text).toString("base64");
    return ctx.reply({ embeds: [brandEmbed({ title: "🔒 Base64 Encoded", description: `\`\`\`${encoded}\`\`\``, page: "Utility" })] });
  },
};
