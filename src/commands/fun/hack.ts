import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
const STEPS = [
  "Accessing mainframe...",
  "Bypassing firewall...",
  "Decrypting SHA-256 hash...",
  "Injecting SQL payload...",
  "Extracting user data...",
  "Uploading to dark web...",
  "Covering tracks...",
  "Complete. 👺",
];
export const command: HybridCommand = {
  name: "hack", description: "Fake-hack someone for fun.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to hack", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const log = STEPS.map((s, i) => `\`${String(i + 1).padStart(2, "0")}\` ${s}`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: `💻 Hacking ${target.username}...`, description: log, page: "Fun" })] });
  },
};
