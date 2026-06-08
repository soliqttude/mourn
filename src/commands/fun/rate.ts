import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "rate",
  description: "Rate something out of 10.",
  category: "fun",
  aliases: ["howmuch", "score"],
  options: [{ name: "thing", description: "What to rate", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const thing = ctx.getString("thing") ?? ctx.args.join(" ");
    if (!thing) return ctx.reply({ content: "Provide something to rate.", ephemeral: true } as any);
    const seed = thing.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
    const rating = (seed % 11);
    const bar = "█".repeat(rating) + "░".repeat(10 - rating);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("⭐ Rating").setDescription(`**${thing}**\n\n[${bar}] **${rating}/10**`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
