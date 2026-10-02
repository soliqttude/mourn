import { config } from "../config.js";

export type IntegrationStatus = { name: string; configured: boolean; detail: string };

export function getIntegrationStatuses(): IntegrationStatus[] {
  return [
    { name: "Last.fm", configured: Boolean(config.integrations.lastfmApiKey), detail: "music profiles, scrobbles and charts" },
    { name: "Twitch", configured: Boolean(config.integrations.twitchClientId && config.integrations.twitchClientSecret), detail: "live streams and notifications" },
    { name: "Fortnite", configured: Boolean(config.integrations.fortniteApiKey), detail: "player/shop API access" },
    { name: "Gemini", configured: Boolean(config.integrations.geminiApiKey), detail: "AI-assisted server setup" },
    { name: "YouTube", configured: true, detail: "RSS feeds and music extraction" },
    { name: "Reddit", configured: true, detail: "public subreddit feeds" },
    { name: "Spotify", configured: true, detail: "music URL extraction through the music provider" },
    { name: "SoundCloud", configured: true, detail: "music URL extraction through the music provider" },
  ];
}

export function integrationEnvHelp(name: string): string | null {
  const keyMap: Record<string, string> = { "Last.fm": "LASTFM_API_KEY", Twitch: "TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET", Fortnite: "FORTNITE_API_KEY", Gemini: "GEMINI_API_KEY" };
  return keyMap[name] ?? null;
}
