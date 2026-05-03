import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "oldest",
  description: "Show the oldest members in the server.",
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const members = await ctx.guild.members.fetch();
    const sorted = [...members.values()]
      .filter(m => !m.user.bot)
      .sort((a, b) => a.user.createdTimestamp - b.user.createdTimestamp)
      .slice(0, 10);
    const list = sorted.map((m, i) => `**${i + 1}.** <@${m.id}> — <t:${Math.floor(m.user.createdTimestamp / 1000)}:D>`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: "Oldest Accounts", description: list, page: "Utility" })] });
  },
};
