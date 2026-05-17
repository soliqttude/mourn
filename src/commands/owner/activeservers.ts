import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "activeservers",
  description: "(Owner) Rank all guilds by commands run in the recent log.",
  usage: "activeservers",
  examples: ["activeservers"],
  category: "owner",
  ownerOnly: true,
  aliases: ["serveractivity", "topservers"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const logs = ownerState.commandLog;
    if (!logs.length) return ctx.reply({ content: "No command logs yet." });

    const counts = new Map<string, { name: string; count: number }>();
    for (const entry of logs) {
      const existing = counts.get(entry.guildId);
      if (existing) existing.count++;
      else counts.set(entry.guildId, { name: entry.guildName, count: 1 });
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15);
    const lines = sorted.map(([guildId, data], i) => {
      const guild = ctx.client.guilds.cache.get(guildId);
      const members = guild?.memberCount ?? "?";
      return `\`${String(i + 1).padStart(2)}\` **${data.name}** — **${data.count}** commands · ${members} members`;
    });

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0f1923)
          .setTitle(`🌐 Most Active Servers — ${ctx.client.guilds.cache.size} total`)
          .setDescription(lines.join("\n"))
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
