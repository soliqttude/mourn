import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "translate",
  description: "Translate text to another language.",
  category: "utility",
  aliases: ["tr", "trans"],
  options: [
    { name: "text", description: "Text to translate", type: ApplicationCommandOptionType.String, required: true },
    { name: "to", description: "Target language code (e.g. es, fr, ja)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const text = ctx.getString("text") ?? ctx.args.slice(0,-1).join(" ");
    const to = ctx.getString("to") ?? ctx.args[ctx.args.length-1] ?? "en";
    if (!text) return ctx.reply({ content: "Provide text.", ephemeral: true } as any);
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${to}`);
      const data = await res.json() as any;
      const translated = data.responseData?.translatedText;
      if (!translated) throw new Error("No result");
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🌐 Translate").addFields({ name: "Original", value: text.slice(0,500) },{ name: `Translation (${to})`, value: translated.slice(0,500) }).setFooter({ text: `Powered by MyMemory • ${config.embedFooter}` }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("Translation failed. Try again.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
