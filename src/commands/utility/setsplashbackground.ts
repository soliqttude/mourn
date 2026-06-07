import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "setsplashbackground",
  aliases: ["setsplash", "splashbg"],
  description: "Set the server invite splash background via URL (requires boost level 1).",
  usage: "setsplashbackground <url>",
  examples: ["setsplashbackground https://i.imgur.com/abc.png"],
  category: "utility",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "url", description: "Image URL (PNG/JPG)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const url = ctx.getString("url") ?? ctx.args[0];
    if (!url) return ctx.reply({ embeds: [errorEmbed("please provide an image URL.")] });
    try {
      await ctx.guild.setSplash(url);
      return ctx.reply({ embeds: [successEmbed("server splash background updated.")] });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`failed to set splash: ${e.message ?? "unknown error"}`)] });
    }
  },
};
