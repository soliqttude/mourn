import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const truths = [
  "What's the most embarrassing thing you've done online?",
  "Have you ever pretended to be offline to avoid someone?",
  "What's a secret you've never told anyone here?",
  "Who was your last DM and what was it about?",
  "What's the pettiest reason you've unfriended/blocked someone?",
  "Have you ever talked trash about someone in this server?",
  "What's something you've lied about in this server?",
  "Who here do you think is the most annoying?",
];

const dares = [
  "Change your nickname to something embarrassing for 10 minutes.",
  "Send a voice message saying you love this server.",
  "Ping your least favorite person and compliment them.",
  "Send the last meme you saved without context.",
  "React to the last 10 messages with the most random emoji.",
  "Type only in ALL CAPS for the next 5 minutes.",
  "Write a haiku about the person above you.",
  "Change your avatar to something random for 30 minutes.",
];

export const command: HybridCommand = {
  name: "truthordare",
  description: "Get a truth or dare prompt.",
  usage: "truthordare [type]",
  examples: ["truthordare"],
  category: "fun",
  aliases: ["tod"],
  options: [{ name: "type", description: "truth or dare", type: ApplicationCommandOptionType.String, required: false,
    choices: [{ name: "truth", value: "truth" }, { name: "dare", value: "dare" }] }],
  async execute(ctx) {
    const type = (ctx.getString("type") ?? (Math.random() > 0.5 ? "truth" : "dare")) as "truth" | "dare";
    const pool = type === "truth" ? truths : dares;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    const emoji = type === "truth" ? "🙋" : "🎯";
    return ctx.reply({ embeds: [brandEmbed({ title: `${emoji} ${type.toUpperCase()}`, description: prompt, page: "Fun" })] });
  },
};
