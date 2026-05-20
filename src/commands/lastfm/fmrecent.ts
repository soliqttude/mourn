import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { lastfmAccounts } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getRecentTracks, hasApiKey } from "../../features/lastfm.js";

export const command: HybridCommand = {
  name: "fmrecent",
  aliases: ["recents", "fmr"],
  description: "Show recent scrobbles.",
  usage: "fmrecent [user]",
  examples: ["fmrecent"],
  category: "lastfm",
  options: [
    { name: "user", description: "Discord user to check", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!hasApiKey()) return ctx.reply({ embeds: [errorEmbed("last.fm api key not configured.")] });

    const target = (await ctx.getUser("user")) ?? ctx.user;
    const row = await db.select().from(lastfmAccounts).where(eq(lastfmAccounts.userId, target.id)).then(r => r[0]);
    if (!row) return ctx.reply({ embeds: [errorEmbed("that user hasn't linked a last.fm account.")] });

    let tracks: any[];
    try {
      tracks = await getRecentTracks(row.username, 10);
    } catch (err: any) {
      return ctx.reply({ embeds: [errorEmbed(err.message ?? "failed to fetch data.")] });
    }

    if (!tracks.length) return ctx.reply({ embeds: [errorEmbed(`**${row.username}** has no recent scrobbles.`)] });

    const lines = tracks.slice(0, 10).map((t, i) => {
      const np = t["@attr"]?.nowplaying === "true" ? "🎵 " : `\`${String(i + 1).padStart(2, " ")}.\` ";
      return `${np}**${t.name}** by ${t.artist?.["#text"] ?? "unknown"}`;
    });

    return ctx.reply({
      embeds: [
        brandEmbed({
          description: lines.join("\n"),
          authorName: `${row.username}'s recent tracks`,
          authorIcon: target.displayAvatarURL({ size: 64 }),
        }),
      ],
    });
  },
};
