import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { distube, formatTime } from "../../features/music.js";
import { config } from "../../config.js";
import { RepeatMode } from "distube";

export const command: HybridCommand = {
  name: "nowplaying",
  aliases: ["np"],
  description: "Show what's currently playing.",
  category: "music",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("Nothing is playing.")] });
    const song = queue.songs[0];
    if (!song) return ctx.reply({ embeds: [errorEmbed("Nothing is playing.")] });
    const total = song.duration ?? 0;
    const current = queue.currentTime;
    const pct = total ? Math.min(current / total, 1) : 0;
    const filled = Math.floor(pct * 20);
    const bar = total
      ? `${"▬".repeat(filled)}🔘${"▬".repeat(20 - filled)} \`${formatTime(current)} / ${formatTime(total)}\``
      : "🔴 LIVE";
    const repeatLabels: Record<RepeatMode, string> = { [RepeatMode.DISABLED]: "off", [RepeatMode.SONG]: "song", [RepeatMode.QUEUE]: "queue" };
    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setAuthor({ name: "now playing", iconURL: song.user?.displayAvatarURL() })
      .setTitle(song.name ?? "Unknown")
      .setURL(song.url)
      .setThumbnail(song.thumbnail ?? null)
      .setDescription(bar)
      .addFields(
        { name: "duration", value: song.formattedDuration ?? "live", inline: true },
        { name: "requested by", value: `<@${song.user?.id ?? "?"}>`, inline: true },
        { name: "repeat", value: repeatLabels[queue.repeatMode] ?? "off", inline: true },
        { name: "volume", value: `${queue.volume}%`, inline: true },
        { name: "queue", value: `${queue.songs.length} song${queue.songs.length === 1 ? "" : "s"}`, inline: true },
        { name: "paused", value: queue.paused ? "yes" : "no", inline: true },
      );
    return ctx.reply({ embeds: [embed] });
  },
};
