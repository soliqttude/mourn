import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const JOKES = [
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
  { setup: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field!" },
  { setup: "I told my wife she was drawing her eyebrows too high.", punchline: "She looked surprised." },
  { setup: "What do you call a fake noodle?", punchline: "An impasta!" },
  { setup: "Why can't you give Elsa a balloon?", punchline: "Because she'll let it go." },
  { setup: "What do you call cheese that isn't yours?", punchline: "Nacho cheese!" },
  { setup: "Why did the bicycle fall over?", punchline: "Because it was two-tired." },
  { setup: "What do you call a sleeping dinosaur?", punchline: "A dino-snore!" },
  { setup: "I used to hate facial hair.", punchline: "But then it grew on me." },
  { setup: "What do you call a factory that makes okay products?", punchline: "A satisfactory." },
  { setup: "I'm reading a book about anti-gravity.", punchline: "It's impossible to put down!" },
  { setup: "Did you hear about the mathematician who's afraid of negative numbers?", punchline: "He'll stop at nothing to avoid them." },
  { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up." },
  { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear!" },
  { setup: "Why did the math book look so sad?", punchline: "Because it had too many problems." },
];

export const command: HybridCommand = {
  name: "joke",
  aliases: ["jokes", "funny"],
  description: "Get a random joke.",
  category: "fun",
  permission: "everyone",
  async execute(ctx) {
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
    return ctx.reply({
      embeds: [brandEmbed({ title: "😂 Random Joke", description: `**${joke.setup}**\n\n${joke.punchline}`, page: "Fun" })],
    });
  },
};
