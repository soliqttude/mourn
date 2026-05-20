import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { lastfmAccounts } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getUserInfo, hasApiKey } from "../../features/lastfm.js";

export const command: HybridCommand = {
  name: "fmprofile",
  aliases: ["lastfmprofile", "fmp"],
  description: "Show a user's Last.fm profile overview.",
  usage: "fmprofile [user]",
  examples: ["fmprofile", "fmprofile @user"],
  category: "lastfm",
  options: [
    { name: "user", description: "Discord user", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!hasApiKey()) return ctx.reply({ embeds: [errorEmbed("last.fm api key not configured.")] });

    const target = (await ctx.getUser("user")) ?? ctx.user;
    const row = await db.select().from(lastfmAccounts).where(eq(lastfmAccounts.userId, target.id)).then(r => r[0]);
    if (!row) {
      const msg = target.id === ctx.user.id
        ? "you haven't linked a last.fm account. use `,fmset [username]`."
        : "that user hasn't linked a last.fm account.";
      return ctx.reply({ embeds: [errorEmbed(msg)] });
    }

    let info: any;
    try {
      info = await getUserInfo(row.username);
    } catch (err: any) {
      return ctx.reply({ embeds: [errorEmbed(err.message ?? "failed to fetch last.fm data.")] });
    }

    const registered = info.registered?.["#text"]
      ? new Date(Number(info.registered["#text"]) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "unknown";

    const fields = [
      { name: "scrobbles", value: Number(info.playcount).toLocaleString(), inline: true },
      { name: "artists",   value: Number(info.artist_count ?? 0).toLocaleString(), inline: true },
      { name: "tracks",    value: Number(info.track_count ?? 0).toLocaleString(), inline: true },
      { name: "albums",    value: Number(info.album_count ?? 0).toLocaleString(), inline: true },
      { name: "loved",     value: Number(info.loved_count ?? 0).toLocaleString(), inline: true },
      { name: "since",     value: registered, inline: true },
    ];

    const avatar = info.image?.find((i: any) => i.size === "extralarge")?.["#text"] || target.displayAvatarURL({ size: 256 });

    return ctx.reply({
      embeds: [
        brandEmbed({
          thumbnail: avatar,
          fields,
          authorName: `${row.username} on last.fm`,
          authorIcon: target.displayAvatarURL({ size: 64 }),
        }),
      ],
    });
  },
};
