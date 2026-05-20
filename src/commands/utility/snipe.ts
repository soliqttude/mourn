import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getSnipe } from "../../features/snipes.js";

export const command: HybridCommand = {
  name: "snipe",
  aliases: ["s"],
  description: "Snipe the last deleted message in this channel.",
  usage: "snipe",
  examples: ["snipe"],
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel) return;
    const snipe = getSnipe(ctx.channel.id, "delete");
    if (!snipe) return ctx.reply({ embeds: [errorEmbed("nothing to snipe.")] });
    const embed = brandEmbed({
      description: snipe.content || "*(no text content)*",
    });
    embed.setAuthor({
      name: snipe.authorTag,
      iconURL: `https://cdn.discordapp.com/avatars/${snipe.authorId}/${snipe.authorId}.png`,
    });
    embed.setTimestamp(new Date(snipe.at));
    if (snipe.attachments?.[0]) embed.setImage(snipe.attachments[0]);
    return ctx.reply({ embeds: [embed] });
  },
};
