import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "base64",
  description: "Encode or decode base64.",
  category: "utility",
  aliases: ["b64"],
  options: [
    { name: "mode", description: "encode or decode", type: ApplicationCommandOptionType.String, required: true },
    { name: "text", description: "Text to process", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const mode = (ctx.getString("mode") ?? ctx.args[0] ?? "encode").toLowerCase();
    const text = ctx.getString("text") ?? ctx.args.slice(1).join(" ");
    if (!text) return ctx.reply({ content: "Provide text.", ephemeral: true } as any);
    let result: string;
    try {
      result = mode === "decode" ? Buffer.from(text, "base64").toString("utf8") : Buffer.from(text).toString("base64");
    } catch {
      return ctx.reply({ content: "Invalid input.", ephemeral: true } as any);
    }
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🔢 Base64 ${mode === "decode" ? "Decode" : "Encode"}`).addFields({ name: "Input", value: `\`${text.slice(0,500)}\`` },{ name: "Output", value: `\`${result.slice(0,500)}\`` }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
