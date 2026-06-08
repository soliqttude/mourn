import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "trivia",
  description: "Get a trivia question.",
  category: "fun",
  aliases: ["quiz"],
  
  async execute(ctx) {
    try {
      const res = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
      const data = await res.json() as any;
      const q = data.results[0];
      const answers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
      const letters = ["A","B","C","D"];
      const formatted = answers.map((a: string, i: number) => `**${letters[i]}.** ${a}`).join("\n");
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🧠 Trivia").addFields({ name: "Category", value: q.category, inline: true },{ name: "Difficulty", value: q.difficulty, inline: true },{ name: "Question", value: q.question.replace(/&amp;/g,"&").replace(/&quot;/g,'"') },{ name: "Options", value: formatted },{ name: "Answer", value: `||**${q.correct_answer}**||` }).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } catch {
      return ctx.reply({ content: "Could not fetch trivia. Try again.", ephemeral: true } as any);
    }
  },
};
