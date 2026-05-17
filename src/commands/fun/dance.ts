import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "dance",
  aliases: ["bust", "boogie"],
  description: "Dance!",
  usage: "dance",
  examples: ["dance"],
  category: "fun",
  async execute(ctx) {
    const gif = await getGif("dance");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} is dancing! 💃`, image: gif, page: "Fun" })] });
  },
};
