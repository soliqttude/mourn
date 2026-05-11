import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "commandstats",
  description: "(Owner) Show most-used commands from the recent log.",
  category: "owner",
  ownerOnly: true,
  aliases: ["cmdstats", "topcommands"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const logs = ownerState.commandLog;
    if (!logs.length) return ctx.reply({ content: "No command logs yet." });

    const counts = new Map<string, number>();
    for (const entry of logs) counts.set(entry.command, (counts.get(entry.command) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

    const maxCount = sorted[0]![1];
    const lines = sorted.map(([cmd, count], i) => {
      const bar = "█".repeat(Math.round((count / maxCount) * 10));
      return `\`${String(i + 1).padStart(2)}\` \`${cmd.padEnd(16)}\` ${bar} **${count}**`;
    });

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0f1923)
          .setTitle(`📊 Command Stats — Last ${logs.length} logged`)
          .setDescription(lines.join("\n"))
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
