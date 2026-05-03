import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "addemoji",
  description: "Add an emoji from a URL or attachment.",
  category: "utility",
  permission: "admin",
  guildOnly: true,
  aliases: ["addmoji"],
  options: [
    { name: "name", description: "Emoji name", type: ApplicationCommandOptionType.String, required: true },
    { name: "url", description: "Image URL", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = ctx.getString("name", true) ?? ctx.args[0];
    const url = ctx.getString("url", true) ?? ctx.args[1];
    if (!name || !url) return;
    try {
      const emoji = await ctx.guild.emojis.create({ attachment: url, name });
      return ctx.reply({ embeds: [successEmbed(`Added emoji **:${emoji.name}:** ${emoji}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed(`Failed: ${(err as Error).message}`)] });
    }
  },
};
