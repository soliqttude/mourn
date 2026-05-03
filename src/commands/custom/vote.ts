import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "vote",
  description: "Vote for Mourn on bot lists.",
  category: "custom",
  async execute(ctx) {
    const voteUrl = (config as any).voteUrl;
    return ctx.reply({
      embeds: [brandEmbed({
        title: "vote for mourn.",
        description: voteUrl
          ? `support the bot by voting:\n\n[**vote here**](${voteUrl})\n${voteUrl}\n\nvoting helps mourn grow. it takes 10 seconds.`
          : "voting isn't set up yet — it's coming soon.\n\nyou can still help by sharing mourn with your friends.",
        page: "Vote",
      })],
    });
  },
};
