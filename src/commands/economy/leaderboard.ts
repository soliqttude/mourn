import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { topRichest } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "richest",
  aliases: ["topcoins", "ecotop"],
  description: "Top richest members in the server.",
  usage: "richest",
  examples: ["richest"],
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await topRichest(ctx.guild.id, 10);
    if (rows.length === 0) return ctx.reply({ embeds: [errorEmbed("Nothing here yet.")] });
    const desc = rows
      .map(
        (r, i) =>
          `**${i + 1}.** <@${r.userId}> — 🩸 ${(r.balance + r.bank).toLocaleString()}`
      )
      .join("\n");
    return ctx.reply({
      embeds: [
        brandEmbed({ title: "💰 Richest", description: desc, page: "Economy" }),
      ],
    });
  },
};
