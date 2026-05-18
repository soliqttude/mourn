import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getTopInviters } from "../../features/invites.js";

export const command: HybridCommand = {
  name: "topinvites",
  description: "Show the top inviters in the server.",
  usage: "topinvites",
  examples: ["topinvites"],
  category: "utility",
  guildOnly: true,
  aliases: ["invitetop", "inviteboard"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await getTopInviters(ctx.guild.id, 10);
    if (!rows.length) {
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "Invite Leaderboard",
            description: "No invite data yet.",
            page: "Utility",
          }),
        ],
      });
    }
    const list = rows
      .filter((r) => r.inviterId !== null)
      .map(
        (r, i) =>
          `**${i + 1}.** <@${r.inviterId}> — **${r.total}** invited · **${r.joined}** here · **${r.left}** left`
      )
      .join("\n");
    return ctx.reply({
      embeds: [brandEmbed({ title: "🏆 Top Inviters", description: list, page: "Utility" })],
    });
  },
};
