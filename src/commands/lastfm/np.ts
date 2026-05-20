import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { lastfmAccounts } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getNowPlaying, hasApiKey } from "../../features/lastfm.js";

export const command: HybridCommand = {
  name: "np",
  aliases: ["nowplaying", "fm"],
  description: "Show what you or another user is listening to on Last.fm.",
  usage: "np [user]",
  examples: ["np", "np @user"],
  category: "lastfm",
  options: [
    { name: "user", description: "Discord user to check", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!hasApiKey()) return ctx.reply({ embeds: [errorEmbed("last.fm api key not configured.")] });

    const target = (await ctx.getUser("user")) ?? ctx.user;
    const row = await db.select().from(lastfmAccounts).where(eq(lastfmAccounts.userId, target.id)).then(r => r[0]);
    if (!row) {
      const msg = target.id === ctx.user.id
        ? "link your last.fm account first with `,fmset [username]`."
        : "that user hasn't linked a last.fm account.";
      return ctx.reply({ embeds: [errorEmbed(msg)] });
    }

    let track;
    try {
      track = await getNowPlaying(row.username);
    } catch (err: any) {
      return ctx.reply({ embeds: [errorEmbed(err.message ?? "failed to fetch last.fm data.")] });
    }

    if (!track) return ctx.reply({ embeds: [errorEmbed(`**${row.username}** hasn't scrobbled anything.`)] });

    const status  = track.nowPlaying ? "listening to" : "last played";
    const lines = [
      `**${track.name}**`,
      `by **${track.artist}**`,
      track.album ? `on *${track.album}*` : null,
      track.loved ? "♥ loved" : null,
    ].filter(Boolean).join("\n");

    const embed = brandEmbed({
      description: lines,
      thumbnail:   track.image ?? undefined,
      authorName:  `${target.globalName ?? target.username} — ${status}`,
      authorIcon:  target.displayAvatarURL({ size: 64 }),
    });
    if (track.url) embed.setURL(track.url);

    return ctx.reply({ embeds: [embed] });
  },
};
