import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
const FORTUNES = [
  "A pleasant surprise is waiting for you.",
  "You will achieve greatness soon.",
  "Hard work pays off — keep going!",
  "An old friend will reach out soon.",
  "Adventure awaits — embrace the unknown.",
  "Success is just around the corner.",
  "Your creativity will lead you to success.",
  "Good things come to those who hustle.",
  "The best is yet to come.",
  "Trust your instincts today.",
  "A smile is the shortest distance between people.",
  "Your kindness will be rewarded.",
  "The right moment is always now.",
  "New beginnings are on the horizon.",
  "Everything you need is already within you.",
  "A small gesture will mean the world to someone.",
  "The stars align in your favour today.",
  "Something beautiful is coming — be patient.",
  "You have untapped potential waiting to emerge.",
  "An opportunity is closer than it appears.",
];
export const command: HybridCommand = {
  name: "fortune", aliases: ["cookie"], description: "Get a fortune cookie message.", category: "fun",
  async execute(ctx) {
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]!;
    return ctx.reply({ embeds: [brandEmbed({ title: "🥠 Fortune Cookie", description: `*"${fortune}"*`, page: "Fun" })] });
  },
};
