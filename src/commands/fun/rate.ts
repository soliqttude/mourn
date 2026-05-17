import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "rate",
  aliases: ["rateme", "howgood"],
  description: "Rate something out of 10.",
  usage: "rate [thing]",
  examples: ["rate"],
  category: "fun",
  options: [{ name: "thing", description: "What to rate", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const thing = ctx.getString("thing", true) ?? ctx.args[0];
    if (!thing) return;
    const hash = thing.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rating = hash % 11;
    const stars = "⭐".repeat(Math.max(1, Math.round(rating / 2)));
    return ctx.reply({ embeds: [brandEmbed({ title: `Rating: ${thing}`, description: `**${rating}/10** ${stars}`, page: "Fun" })] });
  },
};
