import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getInviteStats, getTopInviters } from "../../features/invites.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export const command: HybridCommand = {
  name: "invites",
  aliases: ["myinvites", "invitecount", "inviteleaderboard", "topinvites", "invitetop"],
  description: "See invite stats for a user, or view the server invite leaderboard.",
  usage: "invites [user]",
  examples: ["invites", "invites @user"],
  category: "utility",
  guildOnly: true,
  options: [
    { name: "user", description: "User to check invites for", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const target = await ctx.getUser("user");

    if (!target) {
      const rows = await getTopInviters(ctx.guild.id, 10);

      if (!rows.length) {
        return ctx.reply({
          embeds: [
            brandEmbed({
              authorName: ctx.guild.name,
              authorIcon: ctx.guild.iconURL() ?? undefined,
              description: "no invite data yet — members need to join through tracked invites first.",
              page: "invites",
            }),
          ],
        });
      }

      const totalTracked = rows.reduce((s, r) => s + r.total, 0);

      const list = rows.map((r, i) => {
        const pos = MEDALS[i] ?? `\`${i + 1}.\``;
        return `${pos} <@${r.inviterId}> — **${r.total}** invited · 🟢 **${r.joined}** · 🔴 **${r.left}**`;
      }).join("\n");

      return ctx.reply({
        embeds: [
          brandEmbed({
            authorName: `${ctx.guild.name} — invite leaderboard`,
            authorIcon: ctx.guild.iconURL() ?? undefined,
            thumbnail: ctx.guild.iconURL({ size: 256 }) ?? undefined,
            description: list,
            page: `${totalTracked} total tracked`,
          }),
        ],
      });
    }

    const stats = await getInviteStats(ctx.guild.id, target.id);
    const leaveRate = stats.total > 0 ? Math.round((stats.left / stats.total) * 100) : 0;

    return ctx.reply({
      embeds: [
        brandEmbed({
          authorName: `${target.username} — invites`,
          authorIcon: target.displayAvatarURL(),
          thumbnail: target.displayAvatarURL({ size: 256 }),
          fields: [
            { name: "total", value: `**${stats.total}**`, inline: true },
            { name: "🟢 joined", value: `**${stats.joined}**`, inline: true },
            { name: "🔴 left", value: `**${stats.left}**`, inline: true },
          ],
          description: stats.total === 0
            ? "no invites tracked yet."
            : `**${leaveRate}%** of invited members have left.`,
          page: "invites",
        }),
      ],
    });
  },
};
