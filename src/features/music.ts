import { DisTube, type Queue, type Song, type Playlist } from "distube";
import { YouTubePlugin } from "@distube/youtube";
import { SoundCloudPlugin } from "@distube/soundcloud";
import { SpotifyPlugin } from "@distube/spotify";
import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { existsSync } from "node:fs";
import { db } from "../db/index.js";
import { musicSettings } from "../db/schema.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";
import { EMOJIS } from "../lib/embeds.js";
import ffmpegPath from "ffmpeg-static";

export let distube: DisTube;
let musicInitialized = false;

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
    .setURL(song.url ?? "")
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
  if (musicInitialized) {
    logger.warn("DisTube setup was requested more than once; keeping the existing music engine.");
    return;
  }

  const resolvedFfmpegPath = (ffmpegPath as unknown as string | undefined) ?? "ffmpeg";
  logger.info({
    ffmpegPath: resolvedFfmpegPath,
    bundledFfmpegExists: Boolean(ffmpegPath && existsSync(resolvedFfmpegPath)),
  }, "Initializing DisTube music engine");

  const engine = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [new YouTubePlugin(), new SoundCloudPlugin(), new SpotifyPlugin() as any],
    joinNewVoiceChannel: true,
    nsfw: true,
    savePreviousSongs: true,
    ffmpeg: {
      path: resolvedFfmpegPath,
      args: { global: {}, input: {}, output: {} },
    },
  });

  distube = engine;
  musicInitialized = true;

  engine
    .on("playSong", (queue: Queue, song: Song) => {
      logger.info({ guildId: queue.id, song: song.name, url: song.url }, "DisTube playback started");
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({ embeds: [nowPlayingEmbed(song, queue)] }).catch((err) => {
        logger.warn({ err, guildId: queue.id }, "Failed to send now-playing message");
      });
    })
    .on("addSong", (queue: Queue, song: Song) => {
      logger.info({ guildId: queue.id, song: song.name, url: song.url }, "DisTube song added to queue");
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({
        embeds: [new EmbedBuilder()
          .setColor(config.brandColor)
          .setDescription(`queued **[${song.name}](${song.url})** (position #${queue.songs.length})`)]
      }).catch(() => {});
    })
    .on("addList", (queue: Queue, playlist: Playlist) => {
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({
        embeds: [new EmbedBuilder()
          .setColor(config.brandColor)
          .setDescription(`queued playlist **${playlist.name}** — ${playlist.songs.length} songs`)]
      }).catch(() => {});
    })
    .on("finish", (queue: Queue) => {
      logger.info({ guildId: queue.id }, "DisTube queue finished");
      const ch = queue.textChannel as TextChannel | undefined;
      if (!ch) return;
      ch.send({
        embeds: [new EmbedBuilder().setColor(config.brandColor).setDescription("queue finished.")]
      }).catch(() => {});
    })
    .on("disconnect", (queue: Queue) => {
      logger.debug({ guildId: queue.id }, "DisTube disconnected");
    })
    .on("error", (error: Error, queue: Queue) => {
      logger.error({
        err: error,
        cause: (error as any)?.cause,
        guildId: queue?.id,
        message: error?.message,
      }, "DisTube playback/search error");
      const ch = queue?.textChannel as TextChannel | undefined;
      const msg = error?.message ?? String(error);
      const isYtBlock = /sign in|403|blocked|unavailable|age.restrict|confirm.*human|bot.check/i.test(msg);
      const description = isYtBlock
        ? `YouTube is blocking this request. Try a **SoundCloud** or ${EMOJIS.spotify} **Spotify** URL directly, or use a supported source URL.`
        : `Music error: ${msg}`;
      if (ch) {
        ch.send({
          embeds: [new EmbedBuilder().setColor(0xF0B429).setDescription(description)]
        }).catch(() => {});
      }
    });

  logger.info("DisTube music engine initialized.");
}
