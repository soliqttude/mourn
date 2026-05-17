import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const prompts = [
  "Never have I ever lied about being busy to avoid hanging out.",
  "Never have I ever cried at a movie and refused to admit it.",
  "Never have I ever stalked someone's profile for way too long.",
  "Never have I ever screenshot a conversation to show someone else.",
  "Never have I ever talked to myself out loud when stressed.",
  "Never have I ever pretended to be asleep to avoid a conversation.",
  "Never have I ever sent a message to the wrong person.",
  "Never have I ever lied about reading a book or watching a show.",
  "Never have I ever left someone on read on purpose.",
  "Never have I ever Googled myself.",
];

export const command: HybridCommand = {
  name: "neverhaveiever",
  description: "Get a never have I ever prompt.",
  usage: "neverhaveiever",
  examples: ["neverhaveiever"],
  category: "fun",
  aliases: ["nhie"],
  async execute(ctx) {
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    return ctx.reply({ embeds: [brandEmbed({ title: "🤚 Never Have I Ever", description: prompt, page: "Fun" })] });
  },
};
