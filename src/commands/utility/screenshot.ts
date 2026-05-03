import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "screenshot", aliases: ["ss", "snap"], description: "Take a screenshot of a website.", category: "utility",
  options: [{ name: "url", description: "Website URL to screenshot", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const url = (ctx.getString("url", true) ?? ctx.args[0] ?? "").trim();
    if (!url) return ctx.reply({ embeds: [errorEmbed("Please provide a URL.")] });
    const clean = url.startsWith("http") ? url : `https://${url}`;
    const imgUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodeURIComponent(clean)}`;
    return ctx.reply({ embeds: [brandEmbed({ title: `📸 Screenshot`, description: `[${clean}](${clean})`, image: imgUrl, page: "Screenshot" })] });
  },
};
