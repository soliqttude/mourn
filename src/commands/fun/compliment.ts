import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const compliments = [
  "You make the world a genuinely better place just by being in it.",
  "Your vibe is immaculate. Never change.",
  "You're the kind of person songs are written about.",
  "Whoever has you in their life is lucky as hell.",
  "You radiate the energy of someone who actually has it figured out.",
  "You're effortlessly cool and I think you know it.",
  "The universe definitely took its time making you.",
  "You're one of those rare people who actually listen.",
  "You could start a cult and honestly people would join.",
  "You have main character energy and it shows.",
];

export const command: HybridCommand = {
  name: "compliment",
  aliases: ["comp", "flatter"],
  description: "Compliment someone.",
  usage: "compliment [user]",
  examples: ["compliment"],
  category: "fun",
  options: [{ name: "user", description: "User to compliment", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const c = compliments[Math.floor(Math.random() * compliments.length)];
    return ctx.reply({ embeds: [brandEmbed({ title: `💐 ${target.username}`, description: c, page: "Fun" })] });
  },
};
