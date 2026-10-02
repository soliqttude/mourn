import { config } from "../config.js";

export type IntegrationStatus = { name: string; configured: boolean; detail: string };

export function getIntegrationStatuses(): IntegrationStatus[] {
  const i = config.integrations;
  return [
    { name: "Last.fm", configured: Boolean(i.lastfmApiKey), detail: "profiles, scrobbles and charts", env: "LASTFM_API_KEY" },
    { name: "Twitch", configured: Boolean(i.twitchClientId && i.twitchClientSecret), detail: "live streams and notifications", env: "TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET" },
    { name: "Fortnite", configured: Boolean(i.fortniteApiKey), detail: "player and shop API access", env: "FORTNITE_API_KEY" },
    { name: "Gemini", configured: Boolean(i.geminiApiKey), detail: "AI-assisted server setup", env: "GEMINI_API_KEY" },
    { name: "YouTube", configured: true, detail: "public RSS feeds; API key is optional", env: "YOUTUBE_API_KEY (optional)" },
    { name: "Reddit", configured: true, detail: "public subreddit feeds" },
    { name: "Spotify", configured: true, detail: "music URL extraction; credentials are optional", env: "SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET (optional)" },
    { name: "SoundCloud", configured: true, detail: "music URL extraction" },
    { name: "Kick", configured: Boolean(i.kickApiKey), detail: "stream integrations", env: "KICK_API_KEY" },
    { name: "X", configured: Boolean(i.xBearerToken), detail: "X/Twitter API features", env: "X_BEARER_TOKEN" },
    { name: "Instagram", configured: Boolean(i.instagramAccessToken), detail: "Instagram API features", env: "INSTAGRAM_ACCESS_TOKEN" },
    { name: "TikTok", configured: Boolean(i.tiktokAccessToken), detail: "TikTok API features", env: "TIKTOK_ACCESS_TOKEN" },
    { name: "Pinterest", configured: Boolean(i.pinterestAccessToken), detail: "Pinterest API features", env: "PINTEREST_ACCESS_TOKEN" },
  ];
}

export function integrationEnvHelp(name: string): string | null {
  return getIntegrationStatuses().find(s => s.name === name)?.env ?? null;
}

export function configuredIntegrationCount(): number {
  return getIntegrationStatuses().filter(s => s.configured).length;
}
