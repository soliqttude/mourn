import { DisTube, type Queue, type Song } from "distube";
import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { musicSettings } from "../db/schema.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";

export let distube: DisTube;

export async function getMusicSettings(guildId: string) {
  const rows = await db.select().from(musicSettings).where(eq(musicSettings.guildId, guildId));
  return rows[0] ?? null;
}

export async function setMusicSettings(guildId: string, patch: Partial<typeof musicSettings.$inferInsert>) {
  await db.insert(musicSettings).values({ guildId, ...patch }).onConflictDoUpdate({
    target: musicSettings.guildId,
    set: patch,
  });
}

export async function hasDjPermission(guildId: string, member: any): Promise<boolean> {
  const settings = await getMusicSettings(guildId);
  if (!settings?.djRoleId) return true;
  return member.roles.cache.has(settings.djRoleId) ||
    member.permissions.has("ManageChannels") ||
    member.permissions.has("Administrator");
}

function nowPlayingEmbed(song: Song, queue: Queue): EmbedBuilder {
  const bar = buildProgressBar(queue);
  return new EmbedBuilder()
    .setColor(config.brandColor)
    .setAuthor({ name: "now playing", iconURL: song.user?.displayAvatarURL() })
    .setTitle(song.name ?? "Unknown")
    .setURL(song.url)
    .setThumbnail(song.thumbnail ?? null)
    .addFields(
      { name: "duration", value: song.formattedDuration ?? "live", inline: true },
      { name: "requested by", value: song.user?.username ?? "unknown", inline: true },
      { name: "volume", value: `${queue.volume}%`, inline: true },
      { name: "progress", value: bar, inline: false },
    );
}

function buildProgressBar(queue: Queue): string {
  const total = queue.songs[0]?.duration ?? 0;
  if (!total) return "🔴 LIVE";
  const current = queue.currentTime;
  const pct = Math.min(current / total, 1);
  const filled = Math.floor(pct * 20);
  return `${"▬".repeat(filled)}🔘${"▬".repeat(20 - filled)} \`${formatTime(current)} / ${formatTime(total)}\``;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function setupMusic(client: Client): void {
  distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnEmpty: true,
    leaveOnFinish: true,
    leaveOnStop: true,
    savePreviousSongs: false,
  });

  distube
    .on("playSong", (queue, song) => {
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({ embeds: [nowPlayingEmbed(song, queue)] }).catch(() => {});
    })
    .on("addSong", (queue, song) => {
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({
        embeds: [new EmbedBuilder()
          .setColor(config.brandColor)
          .setDescription(`queued **[${song.name}](${song.url})** (position #${queue.songs.length})`)]
      }).catch(() => {});
    })
    .on("addList", (queue, playlist) => {
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({
        embeds: [new EmbedBuilder()
          .setColor(config.brandColor)
          .setDescription(`queued playlist **${playlist.name}** — ${playlist.songs.length} songs`)]
      }).catch(() => {});
    })
    .on("finish", (queue) => {
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({
        embeds: [new EmbedBuilder().setColor(config.brandColor).setDescription("queue finished. leaving voice channel.")]
      }).catch(() => {});
    })
    .on("disconnect", () => {})
    .on("error", (channel, error) => {
      logger.warn({ err: error }, "distube error");
      if (channel && "send" in channel) {
        (channel as TextChannel).send({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`music error: ${error.message}`)] }).catch(() => {});
      }
    });
}
