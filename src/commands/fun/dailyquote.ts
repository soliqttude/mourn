import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const QUOTES = [
  ["the only way out is through.", "robert frost"],
  ["if you're going through hell, keep going.", "winston churchill"],
  ["do what you can, with what you have, where you are.", "theodore roosevelt"],
  ["it always seems impossible until it's done.", "nelson mandela"],
  ["chaos is a ladder.", "littlefinger"],
  ["the obstacle is the path.", "zen proverb"],
  ["what you resist, persists.", "carl jung"],
  ["we are all just walking each other home.", "ram dass"],
  ["everything you've ever wanted is on the other side of fear.", "george addair"],
  ["sometimes the smallest step in the right direction ends up being the biggest step of your life.", "unknown"],
  ["the comfort zone is a beautiful place, but nothing ever grows there.", "unknown"],
  ["do or do not. there is no try.", "yoda"],
  ["i am not afraid of storms, for i am learning how to sail my ship.", "louisa may alcott"],
  ["the mind is everything. what you think, you become.", "buddha"],
  ["an unexamined life is not worth living.", "socrates"],
  ["to live is the rarest thing in the world. most people just exist.", "oscar wilde"],
  ["not all who wander are lost.", "j.r.r. tolkien"],
  ["two things are infinite: the universe and human stupidity.", "einstein"],
  ["whatever you are, be a good one.", "abraham lincoln"],
  ["be yourself; everyone else is already taken.", "oscar wilde"],
];

function pickQuote(): [string, string] {
  const day = Math.floor(Date.now() / 86_400_000);
  const q = QUOTES[day % QUOTES.length]!;
  return [q[0]!, q[1]!];
}

export const command: HybridCommand = {
  name: "dailyquote",
  description: "Get today's daily quote. Same for everyone, refreshes at midnight.",
  usage: "dailyquote",
  examples: ["dailyquote"],
  category: "fun",
  aliases: ["quote", "dq"],
  async execute(ctx) {
    const [text, author] = pickQuote();
    const tomorrow = Math.floor((Math.floor(Date.now() / 86_400_000) + 1) * 86_400);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("💬 daily quote")
          .setDescription(`*"${text}"*\n\n— **${author}**`)
          .setFooter({ text: `refreshes <t:${tomorrow}:R>` })
          .setTimestamp(),
      ],
    });
  },
};
