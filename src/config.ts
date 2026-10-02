import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const ownerIdsRaw = process.env.BOT_OWNER_IDS || process.env.BOT_OWNER_ID || "";

const optional = (name: string): string => process.env[name]?.trim() || "";

export const config = {
  token: required("DISCORD_TOKEN"),
  ownerId: required("BOT_OWNER_ID"),
  ownerIds: new Set(ownerIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)),
  defaultPrefix: process.env.DEFAULT_PREFIX || ",",
  databaseEnabled: Boolean(process.env.DATABASE_URL) && process.env.ENABLE_DATABASE !== "false",
  databaseUrl: process.env.DATABASE_URL || "",
  logLevel: process.env.LOG_LEVEL || "info",
  botInviteUrl: process.env.BOT_INVITE_URL || "",
  voteUrl: process.env.VOTE_URL || "",
  supportServer: process.env.SUPPORT_SERVER || "",
  brandColor: 0x111114,
  errorColor: 0xc0392b,
  successColor: 0x2a9d54,
  neutralColor: 0x111114,
  embedFooter: process.env.EMBED_FOOTER || "mourn",
  database: {
    maxConnections: Number(process.env.DB_MAX_CONNECTIONS || 10),
    idleTimeoutMs: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  },
  integrationPollIntervalMs: Math.max(60000, Number(process.env.INTEGRATION_POLL_INTERVAL_MS || 300000)),
  integrations: {
    lastfmApiKey: optional("LASTFM_API_KEY"),
    twitchClientId: optional("TWITCH_CLIENT_ID"),
    twitchClientSecret: optional("TWITCH_CLIENT_SECRET"),
    fortniteApiKey: optional("FORTNITE_API_KEY"),
    geminiApiKey: optional("GEMINI_API_KEY"),
    youtubeApiKey: optional("YOUTUBE_API_KEY"),
    spotifyClientId: optional("SPOTIFY_CLIENT_ID"),
    spotifyClientSecret: optional("SPOTIFY_CLIENT_SECRET"),
    kickApiKey: optional("KICK_API_KEY"),
    xBearerToken: optional("X_BEARER_TOKEN"),
    instagramAccessToken: optional("INSTAGRAM_ACCESS_TOKEN"),
    tiktokAccessToken: optional("TIKTOK_ACCESS_TOKEN"),
    pinterestAccessToken: optional("PINTEREST_ACCESS_TOKEN"),
  },
};
