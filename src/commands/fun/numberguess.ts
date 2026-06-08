import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "numberguess",
  description: "Start a number guessing game.",
  category: "fun",
  aliases: ["numguess", "guessnum"],
  options: [{ name: "guess", description: "Your guess (1-100)", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    const guess = ctx.getNumber("guess") ?? parseInt(ctx.args[0] ?? "0");
    if (!guess || guess < 1 || guess > 100) return ctx.reply({ content: "Guess a number between 1 and 100.", ephemeral: true } as any);
    const num = Math.floor(Math.random() * 100) + 1;
    const diff = Math.abs(num - guess);
    const hint = diff === 0 ? "🎯 Exact match!" : diff <= 5 ? "🔥 Very close!" : diff <= 15 ? "😐 Getting warmer..." : "❄️ Way off!";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(diff === 0 ? 0x00e676 : 0xffd700).setTitle("🔢 Number Guess").addFields({ name: "Your Guess", value: guess.toString(), inline: true },{ name: "Number Was", value: num.toString(), inline: true },{ name: "Result", value: hint, inline: false }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
