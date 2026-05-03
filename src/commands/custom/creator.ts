import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "creator",
  description: "About the creator of Mourn.",
  category: "custom",
  aliases: ["dev", "developer", "author"],
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "geico.",
          description: [
            "**mourn** was built and is maintained by a single developer.",
            "",
            "**username** — geico (@udrs)",
            "**discord** — @udrs",
            "**built** — mourn, a full all-in-one Discord toolkit",
            "",
            "if you have suggestions, bugs, or just want to talk — find him.",
          ].join("\n"),
          page: "Creator",
        }),
      ],
    });
  },
};
