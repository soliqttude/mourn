import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "coinflip",
  aliases: ["cf", "flip"],
  description: "Flip a coin.",
  usage: "coinflip",
  examples: ["coinflip"],
  category: "fun",
  permission: "everyone",
  async execute(ctx) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const emoji = result === "Heads" ? "🪙" : "🟤";
    return ctx.reply({
      embeds: [brandEmbed({ title: `${emoji} Coin Flip`, description: `It landed on **${result}**!`, page: "Fun" })],
    });
  },
};
