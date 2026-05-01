import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "aboveall",
  description: "Credits.",
  category: "custom",
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "above all.",
          description:
            "**Mourn** — built by **geico** (@udrs)\nrising above all the rest.",
          page: "Credits",
        }),
      ],
    });
  },
};
