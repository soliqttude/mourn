import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "changemymind",
  description: "Generate a change my mind meme.",
  category: "image",
  aliases: ["cmm", "steveharvey"],
  options: [{ name: "text", description: "Your opinion", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text") ?? ctx.args.join(" ");
    if (!text) return ctx.reply({ content: "Provide text.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🤷 Change My Mind").setImage(`https://some-random-api.com/canvas/misc/changemymind?text=${encodeURIComponent(text)}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
