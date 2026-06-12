import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "donate",
  description: "Support Mourn's development.",
  usage: "donate",
  examples: ["donate"],
  category: "custom",
  aliases: ["support", "donor"],
  async execute(ctx) {
    const link = (config as any).donateUrl || null;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "support mourn.",
          description: link
            ? [
                "mourn is built and maintained solo, for free.",
                "",
                "if you want to support the project:",
                `[**donate here**](${link})`,
                "",
                "every bit helps keep mourn running.",
              ].join("\n")
            : [
                "mourn is built and maintained solo, for free.",
                "",
                "donations aren't open yet — but they're coming soon.",
                "",
                "your support means everything even without a link.",
              ].join("\n"),
          page: "Donate",
        }),
      ],
    });
  },
};
