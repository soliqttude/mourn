import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "slap",
  description: "Get a random anime slap gif.",
  category: "anime",
  aliases: [],
  async execute(ctx) {
    try {
      const res = await fetch("https://api.waifu.pics/sfw/slap");
      const data = await res.json() as { url: string };
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("👋 Slap").setImage(data.url).setFooter({ text: `Requested by ${ctx.user.username} • ${config.embedFooter}` }).setTimestamp()] });
    } catch {
      return ctx.reply({ content: "Could not fetch image. Try again.", ephemeral: true } as any);
    }
  },
};
