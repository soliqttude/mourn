import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getLeaderboard, levelFromXp } from "../../features/leveling.js";

export const command: HybridCommand = {
  name: "leaderboard",
  aliases: ["lb", "top"],
  description: "Top leveled members in the server.",
  category: "levels",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await getLeaderboard(ctx.guild.id, 10);
    if (rows.length === 0) return ctx.reply({ embeds: [errorEmbed("No leveling data yet.")] });
    const desc = rows
      .map(
        (r, i) =>
          `**${i + 1}.** <@${r.userId}> — Lv ${levelFromXp(r.xp)} (${r.xp.toLocaleString()} xp)`
      )
      .join("\n");
    return ctx.reply({
      embeds: [brandEmbed({ title: "🏆 Leaderboard", description: desc, page: "Levels" })],
    });
  },
};
