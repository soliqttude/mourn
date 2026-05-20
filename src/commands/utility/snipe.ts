import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getSnipe } from "../../features/snipes.js";

export const command: HybridCommand = {
  name: "snipe",
  aliases: ["s"],
  description: "Show the last deleted message in this channel.",
  usage: "snipe [index]",
  examples: ["snipe", "snipe 2"],
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel) return;
    const index = Math.max(0, (ctx.getNumber("index") ?? 1) - 1);
    const snipe = getSnipe(ctx.channel.id, "delete", index);
    if (!snipe) return ctx.reply({ embeds: [errorEmbed("nothing to snipe.")] });
    const embed = brandEmbed({ description: snipe.content || "*(no text content)*" });
    embed.setAuthor({ name: snipe.authorTag });
    embed.setTimestamp(new Date(snipe.at));
    if (snipe.attachments?.[0]) embed.setImage(snipe.attachments[0]);
    return ctx.reply({ embeds: [embed] });
  },
};