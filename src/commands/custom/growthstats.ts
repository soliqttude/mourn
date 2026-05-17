import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "growthstats",
  description: "See Bleed's growth across all servers.",
  usage: "growthstats",
  examples: ["growthstats"],
  category: "custom",
  aliases: ["growth", "reach"],
  async execute(ctx) {
    const client = ctx.client;
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const uptime = Math.floor((client.uptime ?? 0) / 1000 / 60 / 60);
    return ctx.reply({
      embeds: [brandEmbed({
        title: "bleed — growth.",
        description: [
          `**${guilds}** servers trust bleed.`,
          `**${users.toLocaleString()}** users reached.`,
          `**${uptime}h** of uptime.`,
          "",
          "every server added makes bleed better.",
          "share it. help it grow.",
        ].join("\n"),
        page: "Growth",
      })],
    });
  },
};
