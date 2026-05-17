import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getSnipe } from "../../features/snipes.js";

export const command: HybridCommand = {
  name: "snipe",
  aliases: ["s"],
  description: "Snipe the last deleted message.",
  usage: "snipe",
  examples: ["snipe"],
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel) return;
    const snipe = getSnipe(ctx.channel.id, "delete");
    if (!snipe) return ctx.reply({ embeds: [errorEmbed("Nothing to snipe.")] });
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `Sniped from ${snipe.authorTag}`,
          description: `${snipe.content || "*(no content)*"}\n\n<t:${Math.floor(snipe.at / 1000)}:R>`,
          page: "Snipe",
        }),
      ],
    });
  },
};
