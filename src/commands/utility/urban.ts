import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "urban",
  description: "Look up a term on Urban Dictionary.",
  category: "utility",
  aliases: ["ud", "slang"],
  options: [{ name: "term", description: "Term to look up", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const term = ctx.getString("term") ?? ctx.args.join(" ");
    if (!term) return ctx.reply({ content: "Provide a term.", ephemeral: true } as any);
    try {
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
      const data = await res.json() as any;
      const entry = data.list?.[0];
      if (!entry) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`No results for **${term}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
      const def = entry.definition.replace(/\[|\]/g,"").slice(0,800);
      const example = entry.example.replace(/\[|\]/g,"").slice(0,400);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x1d2439).setTitle(`📚 ${entry.word}`).setDescription(def).addFields({ name: "Example", value: example || "None" },{ name: "👍", value: entry.thumbs_up.toString(), inline: true },{ name: "👎", value: entry.thumbs_down.toString(), inline: true }).setURL(entry.permalink).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("Failed to fetch from Urban Dictionary.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
