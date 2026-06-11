import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "seticon",
  description: "Set the server icon via URL.",
  usage: "seticon <url>",
  examples: ["seticon https://i.imgur.com/abc.png"],
  category: "utility",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "url", description: "Image URL (PNG/JPG/GIF)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const url = ctx.getString("url") ?? ctx.args[0];
    if (!url) return ctx.reply({ embeds: [errorEmbed("Please provide an image URL.")] });
    try {
      await ctx.guild.setIcon(url);
      return ctx.reply({ embeds: [successEmbed("Server icon updated.")] });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`failed to set icon: ${e.message ?? "unknown error"}`)] });
    }
  },
};
