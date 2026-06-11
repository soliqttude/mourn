import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "setbanner",
  description: "Set the server banner via URL (requires boost level 2).",
  usage: "setbanner <url>",
  examples: ["setbanner https://i.imgur.com/abc.png"],
  category: "utility",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "url", description: "Image URL (PNG/JPG)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const url = ctx.getString("url") ?? ctx.args[0];
    if (!url) return ctx.reply({ embeds: [errorEmbed("Please provide an image URL.")] });
    try {
      await ctx.guild.setBanner(url);
      return ctx.reply({ embeds: [successEmbed("Server banner updated.")] });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`failed to set banner: ${e.message ?? "unknown error"}`)] });
    }
  },
};
