import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { lastfmAccounts } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getTopAlbums, hasApiKey } from "../../features/lastfm.js";

const PERIODS: Record<string, string> = {
  "7day": "7 days", "1month": "1 month", "3month": "3 months",
  "6month": "6 months", "12month": "12 months", "overall": "all time",
};

export const command: HybridCommand = {
  name: "topalbums",
  aliases: ["fmalbums", "tal"],
  description: "Show top Last.fm albums.",
  usage: "topalbums [period] [user]",
  examples: ["topalbums", "topalbums 3month"],
  category: "lastfm",
  options: [
    { name: "period", description: "7day | 1month | 3month | 6month | 12month | overall", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "Discord user", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!hasApiKey()) return ctx.reply({ embeds: [errorEmbed("Last.fm api key not configured.")] });

    const rawPeriod = ctx.getString("period") ?? ctx.args[0] ?? "overall";
    const period = PERIODS[rawPeriod] ? rawPeriod : "overall";
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const row = await db.select().from(lastfmAccounts).where(eq(lastfmAccounts.userId, target.id)).then(r => r[0]);
    if (!row) return ctx.reply({ embeds: [errorEmbed("That **user** hasn't linked a last.fm account.")] });

    const albums = await getTopAlbums(row.username, period, 10).catch(() => null);
    if (!albums?.length) return ctx.reply({ embeds: [errorEmbed("No data.")] });

    const lines = albums.slice(0, 10).map((a: any, i: number) =>
      `\`${String(i + 1).padStart(2, " ")}.\` **${a.name}** by ${a.artist?.name ?? "?"} — ${Number(a.playcount).toLocaleString()}x`
    );

    return ctx.reply({
      embeds: [
        brandEmbed({
          description: lines.join("\n"),
          authorName: `${row.username}'s top albums — ${PERIODS[period] ?? period}`,
          authorIcon: target.displayAvatarURL({ size: 64 }),
        }),
      ],
    });
  },
};
