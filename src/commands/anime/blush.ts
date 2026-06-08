import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "blush",
  description: "Get a random anime blush gif.",
  category: "anime",
  aliases: [],
  async execute(ctx) {
    try {
      const res = await fetch("https://api.waifu.pics/sfw/blush");
      const data = await res.json() as { url: string };
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("😳 Blush").setImage(data.url).setFooter({ text: `Requested by ${ctx.user.username} • ${config.embedFooter}` }).setTimestamp()] });
    } catch {
      return ctx.reply({ content: "Could not fetch image. Try again.", ephemeral: true } as any);
    }
  },
};
