import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "drake",
  description: "Generate a Drake meme.",
  category: "image",
  aliases: ["drakememe"],
  options: [
    { name: "bad", description: "What Drake disapproves of", type: ApplicationCommandOptionType.String, required: true },
    { name: "good", description: "What Drake approves of", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const bad = ctx.getString("bad") ?? ctx.args[0];
    const good = ctx.getString("good") ?? ctx.args[1];
    if (!bad || !good) return ctx.reply({ content: "Provide both options.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🦆 Drake Meme").setImage(`https://some-random-api.com/canvas/misc/drake?top=${encodeURIComponent(bad)}&bottom=${encodeURIComponent(good)}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
