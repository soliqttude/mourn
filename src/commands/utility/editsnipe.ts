import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getSnipe } from "../../features/snipes.js";

export const command: HybridCommand = {
  name: "editsnipe",
  aliases: ["es"],
  description: "Snipe the last edited message.",
  usage: "editsnipe",
  examples: ["editsnipe"],
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel) return;
    const snipe = getSnipe(ctx.channel.id, "edit");
    if (!snipe) return ctx.reply({ embeds: [errorEmbed("Nothing to snipe.")] });
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `Edit by ${snipe.authorTag}`,
          fields: [
            { name: "Before", value: snipe.content.slice(0, 1000) || "*(empty)*" },
            { name: "After", value: (snipe.after ?? "").slice(0, 1000) || "*(empty)*" },
          ],
          page: "EditSnipe",
        }),
      ],
    });
  },
};
