import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationCommandOptionType,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getInviteStats, getTopInviters } from "../../features/invites.js";

const PAGE_SIZE = 10;

export async function buildLeaderboardMessage(
  guildId: string,
  page: number,
  requesterId: string,
) {
  const allRows = await getTopInviters(guildId);
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const p = Math.max(0, Math.min(page, totalPages - 1));
  const pageRows = allRows.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
  const startIdx = p * PAGE_SIZE;

  const description =
    pageRows.length === 0
      ? "no invite data yet — members need to join through tracked invites first."
      : pageRows
          .map((r, i) => {
            const total = r.regular + r.left + r.fake + r.bonus;
            return `**${startIdx + i + 1}.** <@${r.inviterId}> • **${total}** invite${total !== 1 ? "s" : ""}. (**${r.regular}** regular, **${r.left}** left, **${r.fake}** fake, **${r.bonus}** bonus)`;
          })
          .join("\n");

  const embed = brandEmbed({
    title: "Invites Leaderboard",
    description,
    page: `Page ${p + 1}`,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`invites:first:${p}:${guildId}:${requesterId}`)
      .setEmoji("⏮")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(p === 0),
    new ButtonBuilder()
      .setCustomId(`invites:prev:${p}:${guildId}:${requesterId}`)
      .setEmoji("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(p === 0),
    new ButtonBuilder()
      .setCustomId(`invites:stop:${p}:${guildId}:${requesterId}`)
      .setEmoji("⏹")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`invites:next:${p}:${guildId}:${requesterId}`)
      .setEmoji("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(p >= totalPages - 1),
  );

  return { embed, row, page: p, totalPages };
}

export const command: HybridCommand = {
  name: "invites",
  aliases: ["myinvites", "invitecount", "inviteleaderboard", "topinvites", "invitetop"],
  description: "See invite stats for a user, or view the server invite leaderboard.",
  usage: "invites [user]",
  examples: ["invites", "invites @user"],
  category: "utility",
  guildOnly: true,
  options: [
    {
      name: "user",
      description: "User to check invites for",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const target = await ctx.getUser("user");

    if (!target) {
      const { embed, row } = await buildLeaderboardMessage(ctx.guild.id, 0, ctx.user.id);
      return ctx.reply({ embeds: [embed], components: [row as any] });
    }

    const stats = await getInviteStats(ctx.guild.id, target.id);
    const total = stats.regular + stats.left + stats.fake + stats.bonus;

    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Invites",
          authorName: target.username,
          authorIcon: target.displayAvatarURL(),
          thumbnail: target.displayAvatarURL({ size: 256 }),
          description: `**${total}** invite${total !== 1 ? "s" : ""}. (**${stats.regular}** regular, **${stats.left}** left, **${stats.fake}** fake, **${stats.bonus}** bonus)`,
          page: "invites",
        }),
      ],
    });
  },
};
