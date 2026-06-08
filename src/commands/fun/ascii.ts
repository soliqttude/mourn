import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ascii",
  description: "Convert text to ASCII art.",
  category: "fun",
  aliases: ["asciiart", "figlet"],
  options: [{ name: "text", description: "Text to convert", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = (ctx.getString("text") ?? ctx.args.join(" ")).slice(0,20);
    if (!text) return ctx.reply({ content: "Provide text.", ephemeral: true } as any);
    const encoded = encodeURIComponent(text);
    try {
      const res = await fetch(`https://artii.herokuapp.com/make?text=${encoded}&font=big`);
      const art = await res.text();
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🔤 ASCII Art").setDescription(`\`\`\`\n${art.slice(0,900)}\
\`\`\``).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🔤 ASCII Art").setDescription(`\`\`\`\n${text.toUpperCase()}
\`\`\``).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
