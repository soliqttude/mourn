import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const CHOICES = ["rock", "paper", "scissors"] as const;
type Choice = typeof CHOICES[number];
const EMOJI: Record<Choice, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };

function getResult(player: Choice, bot: Choice): "win" | "lose" | "tie" {
  if (player === bot) return "tie";
  if ((player === "rock" && bot === "scissors") || (player === "paper" && bot === "rock") || (player === "scissors" && bot === "paper")) return "win";
  return "lose";
}

export const command: HybridCommand = {
  name: "rps",
  aliases: ["rockpaperscissors", "rockpaper"],
  description: "Play rock paper scissors against the bot.",
  usage: "rps [choice]",
  examples: ["rps"],
  category: "fun",
  permission: "everyone",
  options: [
    {
      name: "choice",
      description: "Your choice",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Rock 🪨", value: "rock" },
        { name: "Paper 📄", value: "paper" },
        { name: "Scissors ✂️", value: "scissors" },
      ],
    },
  ],
  async execute(ctx) {
    const player = ctx.getString("choice", true) as Choice;
    const bot = CHOICES[Math.floor(Math.random() * CHOICES.length)];
    const result = getResult(player, bot);
    const resultText = result === "win" ? "🎉 You win!" : result === "lose" ? "😔 You lose!" : "🤝 It's a tie!";
    return ctx.reply({
      embeds: [brandEmbed({
        title: "✂️ Rock Paper Scissors",
        description: `You: ${EMOJI[player]} **${player}**\nBot: ${EMOJI[bot]} **${bot}**\n\n${resultText}`,
        page: "Fun",
      })],
    });
  },
};
