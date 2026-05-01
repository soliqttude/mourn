import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "ping",
  description: "Show the bot's latency.",
  category: "utility",
  async execute(ctx) {
    const ws = ctx.client.ws.ping;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "🏓 Pong",
          description: `**WebSocket:** ${ws}ms`,
          page: "Ping",
        }),
      ],
    });
  },
};
