import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "smug",
  aliases: ["smugface", "smirk"],
  description: "Give a smug look.",
  usage: "smug",
  examples: ["smug"],
  category: "fun",
  async execute(ctx) {
    const gif = await getGif("smug");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} is feeling smug 😏`, image: gif, page: "Fun" })] });
  },
};
