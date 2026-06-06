import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const VOTE_URL = "https://top.gg/bot/1499466116768993461";

export const command: HybridCommand = {
  name: "vote",
  description: "Vote for bleed on top.gg.",
  usage: "vote",
  examples: ["vote"],
  category: "custom",
  async execute(ctx) {
    return ctx.reply({
      embeds: [brandEmbed({
        title: "vote for bleed.",
        description: `support the bot by voting:\n\n[**vote here**](${VOTE_URL})\n${VOTE_URL}\n\nvoting helps bleed grow. it takes 10 seconds.`,
        page: "Vote",
      })],
    });
  },
};
