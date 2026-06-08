import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "color",
  description: "Get info about a color.",
  category: "utility",
  aliases: ["colour", "hex"],
  options: [{ name: "hex", description: "Hex color code (e.g. #ff0000)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const hex = (ctx.getString("hex") ?? ctx.args[0] ?? "").replace("#","");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return ctx.reply({ content: "Provide a valid hex code (e.g. #ff0000).", ephemeral: true } as any);
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    const colorInt = parseInt(hex,16);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(colorInt).setTitle(`🎨 Color: #${hex.toUpperCase()}`).addFields({ name: "HEX", value: `#${hex.toUpperCase()}`, inline: true },{ name: "RGB", value: `${r}, ${g}, ${b}`, inline: true },{ name: "Integer", value: colorInt.toString(), inline: true }).setImage(`https://singlecolorimage.com/get/${hex}/200x100`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
