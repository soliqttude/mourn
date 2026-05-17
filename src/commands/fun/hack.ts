import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const STEP_POOLS = [
  [
    "going through their messages...",
    "checking their deleted messages...",
    "reading their dms...",
    "found their search history...",
  ],
  [
    "located their alt account...",
    "found 3 other accounts...",
    "they lied about their age...",
    "found their main...",
  ],
  [
    "accessing camera...",
    "turning on their mic...",
    "screen recording started...",
    "got into their files...",
  ],
  [
    "this is bad for them...",
    "oh wow...",
    "they really said that...",
    "finding a lot here...",
  ],
  [
    "packaging everything...",
    "almost done...",
    "compiling the evidence...",
    "preparing the drop...",
  ],
  [
    "sending to the server...",
    "posting everything...",
    "leaking it all...",
    "it's out there now...",
  ],
  [
    "they're cooked. 👺",
    "rip to them honestly.",
    "they never stood a chance.",
    "another one down.",
  ],
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export const command: HybridCommand = {
  name: "hack",
  aliases: ["hacking", "hackme"],
  description: "Fake-hack someone for fun.",
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to hack", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const steps = STEP_POOLS.map(pool => pick(pool));
    const log = steps.map((s, i) => `\`${String(i + 1).padStart(2, "0")}\` ${s}`).join("\n");
    return ctx.reply({
      embeds: [
        brandEmbed({
          description: `**hacking ${target.username}**\n\n${log}`,
          page: "Fun",
        }),
      ],
    });
  },
};
