import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "mourn",
  description: "What is Mourn?",
  usage: "mourn",
  examples: ["mourn"],
  category: "custom",
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Mourn — All-in-One Discord Toolkit",
          description: "> Built different. Built to last.
> One bot. Every feature your server needs.",
          fields: [
            { name: "🛡️  Moderation", value: "Ban, kick, warn, jail, timeout, case logs, word filter, anti-nuke, anti-raid", inline: false },
            { name: "⚙️  Utility", value: "Embeds, polls, reminders, starboard, reaction roles, voicemaster, tickets", inline: false },
            { name: "💰  Economy", value: "Coins, shop, gambling, fishing, heists, leaderboards", inline: false },
            { name: "📈  Levels", value: "XP system, rank cards, role rewards", inline: true },
            { name: "🎉  Fun", value: "8ball, trivia, rps, ship, and more", inline: true },
            { name: "👤  Developer", value: "geico (@udrs)", inline: false },
          ],
          page: "Mourn",
        }),
      ],
    });
  },
};