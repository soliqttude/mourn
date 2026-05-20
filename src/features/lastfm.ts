import { logger } from "../lib/logger.js";

const API_BASE = "https://ws.audioscrobbler.com/2.0/";
const API_KEY  = process.env.LASTFM_API_KEY ?? "";

export function hasApiKey(): boolean { return !!API_KEY; }

async function call(method: string, params: Record<string, string>): Promise<any> {
  const url = new URL(API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const json = await res.json() as any;
  if (json.error) throw new Error(json.message ?? String(json.error));
  return json;
}

export async function getNowPlaying(username: string) {
  const data = await call("user.getRecentTracks", { user: username, limit: "1", extended: "1" });
  const tracks: any[] = data.recenttracks?.track ?? [];
  if (!tracks.length) return null;
  const track = tracks[0];
  return {
    nowPlaying: track["@attr"]?.nowplaying === "true",
    artist:     track.artist?.name ?? track.artist?.["#text"] ?? "unknown",
    name:       track.name ?? "unknown",
    album:      track.album?.["#text"] ?? null,
    image:      (track.image as any[])?.find((i: any) => i.size === "extralarge")?.["#text"] || null,
    url:        track.url ?? null,
    loved:      track.loved === "1",
    userUrl:    `https://www.last.fm/user/${username}`,
  };
}

export async function getRecentTracks(username: string, limit = 10) {
  const data = await call("user.getRecentTracks", { user: username, limit: String(limit) });
  return (data.recenttracks?.track ?? []) as any[];
}

export async function getTopArtists(username: string, period = "overall", limit = 10) {
  const data = await call("user.getTopArtists", { user: username, period, limit: String(limit) });
  return (data.topartists?.artist ?? []) as any[];
}

export async function getTopTracks(username: string, period = "overall", limit = 10) {
  const data = await call("user.getTopTracks", { user: username, period, limit: String(limit) });
  return (data.toptracks?.track ?? []) as any[];
}

export async function getTopAlbums(username: string, period = "overall", limit = 10) {
  const data = await call("user.getTopAlbums", { user: username, period, limit: String(limit) });
  return (data.topalbums?.album ?? []) as any[];
}

export async function getUserInfo(username: string) {
  const data = await call("user.getInfo", { user: username });
  return data.user as any;
}
