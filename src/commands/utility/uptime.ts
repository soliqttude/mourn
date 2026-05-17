import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { formatDuration } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "uptime",
  aliases: ["ut", "botuptime"],
  description: "Show how long the bot has been online.",
  usage: "uptime",
  examples: ["uptime"],
  category: "utility",
  async execute(ctx) {
    const ms = ctx.client.uptime ?? 0;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Uptime",
          description: formatDuration(ms),
          page: "Uptime",
        }),
      ],
    });
  },
};
