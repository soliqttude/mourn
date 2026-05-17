import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "embed",
  aliases: ["buildembed", "embedbuilder"],
  description: "Send a custom embed message.",
  category: "utility",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "title", description: "Embed title", type: ApplicationCommandOptionType.String, required: true },
    { name: "description", description: "Embed description", type: ApplicationCommandOptionType.String, required: true },
    { name: "color", description: "Hex color (e.g. #8B0000)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const title = ctx.getString("title", true);
    const desc = ctx.getString("description", true);
    const color = ctx.getString("color");
    if (!title || !desc) return;
    let parsed = config.brandColor;
    if (color) {
      const cleaned = color.replace("#", "");
      const num = parseInt(cleaned, 16);
      if (!Number.isNaN(num)) parsed = num;
    }
    const eb = new EmbedBuilder()
      .setColor(parsed)
      .setTitle(title)
      .setDescription(desc);
    if (!ctx.channel) return ctx.reply({ embeds: [errorEmbed("Cannot send here.")] });
    await ctx.channel.send({ embeds: [eb] });
    return ctx.reply({ embeds: [successEmbed("Embed sent.")], ephemeral: true });
  },
};
