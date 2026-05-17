import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "rome",
  aliases: ["blitz"],
  description: "Check out rome/blitz and his tools.",
  usage: "rome",
  examples: ["rome"],
  category: "custom",
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          description: [
            "rome/blitz has the best tools and ipas on the market and he has the best prices",
            "+ over **40** free ipas and larp pics + vids!",
            "",
            "**https://discord.gg/MRXQhsNyzr**",
          ].join("\n"),
        }),
      ],
    });
  },
};
