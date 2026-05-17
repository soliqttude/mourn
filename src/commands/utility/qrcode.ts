import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "qrcode",
  description: "Generate a QR code for text or a URL.",
  usage: "qrcode [text]",
  examples: ["qrcode"],
  category: "utility",
  aliases: ["qr"],
  options: [{ name: "text", description: "Text or URL to encode", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
    return ctx.reply({ embeds: [brandEmbed({ title: "QR Code", description: `\`${text.slice(0, 100)}\``, image: url, page: "Utility" })] });
  },
};
