import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "qr",
  description: "Generate a QR code from text or URL.",
  category: "utility",
  aliases: ["qrcode"],
  options: [{ name: "text", description: "Text or URL to encode", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text") ?? ctx.args.join(" ");
    if (!text) return ctx.reply({ content: "Provide text.", ephemeral: true } as any);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x000000).setTitle("📷 QR Code").setDescription(`\`${text.slice(0,100)}\``).setImage(url).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
