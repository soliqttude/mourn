import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "mourn",
  description: "What is Mourn?",
  category: "custom",
  async execute(ctx) {
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "mourn.",
          description: [
            "an all-in-one Discord toolkit built different.",
            "",
            "**moderation** — ban, kick, warn, jail, timeout, case logs, word filter, anti-nuke, anti-raid",
            "**utility** — embeds, polls, reminders, invites, starboard, reaction roles, voicemaster, tickets",
            "**economy** — coins, shop, gambling, fishing, leaderboards",
            "**levels** — xp system, rank cards, role rewards",
            "**fun** — 8ball, coinflip, facts, jokes, rps",
            "",
            "built by **geico** (@udrs). built to last.",
          ].join("\n"),
          page: "Mourn",
        }),
      ],
    });
  },
};
