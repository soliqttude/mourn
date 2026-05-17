import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "vote",
  description: "Vote for Bleed on bot lists.",
  usage: "vote",
  examples: ["vote"],
  category: "custom",
  async execute(ctx) {
    const voteUrl = (config as any).voteUrl;
    return ctx.reply({
      embeds: [brandEmbed({
        title: "vote for bleed.",
        description: voteUrl
          ? `support the bot by voting:\n\n[**vote here**](${voteUrl})\n${voteUrl}\n\nvoting helps bleed grow. it takes 10 seconds.`
          : "voting isn't set up yet — it's coming soon.\n\nyou can still help by sharing bleed with your friends.",
        page: "Vote",
      })],
    });
  },
};
