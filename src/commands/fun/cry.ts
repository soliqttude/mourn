import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "cry",
  aliases: ["sob", "weep"],
  description: "Express your sadness.",
  usage: "cry",
  examples: ["cry"],
  category: "fun",
  async execute(ctx) {
    const gif = await getGif("cry");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} is crying... 😭`, image: gif, page: "Fun" })] });
  },
};
