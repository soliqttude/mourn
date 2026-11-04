import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "setbanner",
  aliases: ["serverbanner"],
  description: "Set the server banner via URL (requires a banner-capable server).",
  usage: "setbanner <url>",
  examples: ["setbanner https://example.com/banner.png"],
  category: "utility",
  permission: "manage_guild",
  guildOnly: true,
  options: [{ name: "url", description: "Image URL (PNG/JPG)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const url = ctx.getString("url") ?? ctx.args[0];
    if (!url || !/^https?:\/\//i.test(url)) return ctx.reply({ embeds: [errorEmbed("Provide a valid HTTP or HTTPS image URL.")] });
    try {
      await ctx.guild.setBanner(url);
      return ctx.reply({ embeds: [successEmbed("Server banner updated.")] });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`Failed to set server banner: ${e.message ?? "unknown error"}`)] });
    }
  },
};
