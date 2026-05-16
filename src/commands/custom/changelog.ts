import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const entries = [
  {
    version: "v1.3.0",
    date: "May 2025",
    changes: [
      "added botinfo, creator, bleed, invite, website, donate, changelog commands",
      "fixed setxp amount option type mismatch",
      "improved error handling across all slash commands",
    ],
  },
  {
    version: "v1.2.0",
    date: "Apr 2025",
    changes: [
      "added full leveling system with role rewards",
      "added giveaway system (gcreate, gend, greroll)",
      "added economy fishing, gambling, shop system",
    ],
  },
  {
    version: "v1.1.0",
    date: "Mar 2025",
    changes: [
      "added anti-nuke and anti-raid protection",
      "added voicemaster (custom voice channels)",
      "added ticket system with panel support",
      "added starboard, reaction roles, autoresponders",
    ],
  },
  {
    version: "v1.0.0",
    date: "Feb 2025",
    changes: [
      "initial release of bleed",
      "full moderation suite (ban, kick, warn, timeout, jail, etc.)",
      "case logging system",
      "welcome, goodbye, boost messages",
    ],
  },
];

export const command: HybridCommand = {
  name: "changelog",
  description: "Recent updates and changes to Bleed.",
  category: "custom",
  aliases: ["updates", "patch", "patchnotes"],
  async execute(ctx) {
    const description = entries
      .map(
        (e) =>
          `**${e.version}** — ${e.date}\n${e.changes.map((c) => `- ${c}`).join("\n")}`
      )
      .join("\n\n");

    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "bleed — changelog.",
          description,
          page: "Changelog",
        }),
      ],
    });
  },
};
