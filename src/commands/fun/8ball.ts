import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const ANSWERS = [
  "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes, definitely.",
  "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.",
  "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
  "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
  "Don't count on it.", "My reply is no.", "My sources say no.",
  "Outlook not so good.", "Very doubtful.",
];

export const command: HybridCommand = {
  name: "8ball",
  aliases: ["8b", "magic8ball", "ask"],
  description: "Ask the magic 8ball a question.",
  usage: "8ball [question]",
  examples: ["8ball"],
  category: "fun",
  permission: "everyone",
  options: [
    { name: "question", description: "Your question", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const question = ctx.getString("question", true)!;
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    return ctx.reply({
      embeds: [brandEmbed({ title: "🎱 Magic 8Ball", description: `**Question:** ${question}\n**Answer:** ${answer}`, page: "Fun" })],
    });
  },
};
