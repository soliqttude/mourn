import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getInviteStats, getTopInviters } from "../../features/invites.js";

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
              title: "Invite Leaderboard",
              description: "No invite data yet. Members need to join through tracked invites first.",
              page: "Invites",
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
        embeds: [
          brandEmbed({
            title: `🏆 Invite Leaderboard — ${ctx.guild.name}`,
            description: list || "No data.",
            page: "Invites",
          }),
        ],
      });
    }

    const stats = await getInviteStats(ctx.guild.id, target.id);

    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `Invites — ${target.username}`,
          description: [
            `**Total invited:** ${stats.total}`,
            `**Still in server:** ${stats.joined}`,
            `**Left:** ${stats.left}`,
          ].join("\n"),
          thumbnail: target.displayAvatarURL(),
          page: "Invites",
        }),
      ],
    });
  },
};
