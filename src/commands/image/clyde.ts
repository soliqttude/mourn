import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "clyde",
  description: "Make Clyde say something.",
  category: "image",
  aliases: ["clydesay"],
  options: [{ name: "text", description: "What Clyde should say", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text") ?? ctx.args.join(" ");
    if (!text) return ctx.reply({ content: "Provide text.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🤖 Clyde says...").setImage(`https://some-random-api.com/canvas/misc/clyde?text=${encodeURIComponent(text)}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
