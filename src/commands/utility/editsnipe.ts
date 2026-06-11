import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getSnipe } from "../../features/snipes.js";

export const command: HybridCommand = {
  name: "editsnipe",
  aliases: ["es"],
  description: "Snipe the last edited message in this channel.",
  usage: "editsnipe",
  examples: ["editsnipe"],
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel) return;
    const snipe = getSnipe(ctx.channel.id, "edit");
    if (!snipe) return ctx.reply({ embeds: [errorEmbed("Nothing to editsnipe.")] });
    const embed = brandEmbed({
      description: snipe.content || "*(no text content)*",
    });
    embed.setAuthor({ name: snipe.authorTag });
    embed.setTimestamp(new Date(snipe.at));
    return ctx.reply({ embeds: [embed] });
  },
};
