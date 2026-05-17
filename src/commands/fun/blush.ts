import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "blush",
  aliases: ["embarrassed"],
  description: "Express blushing.",
  category: "fun",
  async execute(ctx) {
    const gif = await getGif("blush");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} is blushing! 😊`, image: gif, page: "Fun" })] });
  },
};
