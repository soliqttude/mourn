import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "newest",
  aliases: ["newmembers", "latestjoins"],
  description: "Show the newest members in the server.",
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const members = await ctx.guild.members.fetch();
    const sorted = [...members.values()]
      .filter(m => !m.user.bot)
      .sort((a, b) => b.joinedTimestamp! - a.joinedTimestamp!)
      .slice(0, 10);
    const list = sorted.map((m, i) => `**${i + 1}.** <@${m.id}> — <t:${Math.floor((m.joinedTimestamp ?? 0) / 1000)}:R>`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: "Newest Members", description: list, page: "Utility" })] });
  },
};
