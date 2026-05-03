import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const questions = [
  ["Have no internet for a week", "Have no money for a week"],
  ["Always be late", "Always be an hour early"],
  ["Be famous but hated", "Be unknown but loved"],
  ["Lose your memories", "Lose your ability to make new ones"],
  ["Only speak in rhymes", "Only speak in questions"],
  ["Have no phone for a month", "Have no music for a year"],
  ["Be too hot all the time", "Be too cold all the time"],
  ["Know when you'll die", "Know how you'll die"],
  ["Be able to fly but only at walking speed", "Be able to run at 200mph but not fly"],
  ["Live in the past", "Live in the future"],
];

export const command: HybridCommand = {
  name: "wouldyourather",
  description: "Get a would you rather question.",
  category: "fun",
  aliases: ["wyr"],
  async execute(ctx) {
    const [a, b] = questions[Math.floor(Math.random() * questions.length)]!;
    return ctx.reply({ embeds: [brandEmbed({ title: "🤔 Would You Rather...", description: `**A)** ${a}\n\n**B)** ${b}`, page: "Fun" })] });
  },
};
