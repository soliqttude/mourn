import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "creator",
  description: "About the creator of Mourn.",
  usage: "creator",
  examples: ["creator"],
  category: "custom",
  aliases: ["dev", "developer", "author"],
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Creator",
          description: [
            "> made mourn by myself, still working on it.",
            "> hit me up if something's broken or u got ideas.",
          ].join("\n"),
          fields: [
            { name: "Discord", value: "@remandment", inline: true },
          ],
          page: "Creator",
        }),
      ],
    });
  },
};
