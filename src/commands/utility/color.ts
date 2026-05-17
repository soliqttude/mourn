import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "color",
  description: "Preview a hex color.",
  usage: "color [hex]",
  examples: ["color"],
  category: "utility",
  aliases: ["hex", "colour"],
  options: [{ name: "hex", description: "Hex color code (e.g. #ff0000)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const raw = (ctx.getString("hex", true) ?? ctx.args[0] ?? "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return ctx.reply({ embeds: [errorEmbed("Provide a valid 6-digit hex color (e.g. `ff0000`).")] });
    const int = parseInt(raw, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    const embed = new EmbedBuilder()
      .setColor(int)
      .setTitle(`#${raw.toUpperCase()}`)
      .setDescription(`**RGB:** ${r}, ${g}, ${b}\n**Decimal:** ${int}`)
      .setThumbnail(`https://singlecolorimage.com/get/${raw}/100x100`)
      .setFooter({ text: "Bleed • Color" })
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  },
};
