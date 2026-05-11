import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  token: required("DISCORD_TOKEN"),
  ownerId: required("BOT_OWNER_ID"),
  defaultPrefix: process.env.DEFAULT_PREFIX || ",",
  databaseUrl: required("DATABASE_URL"),
  logLevel: process.env.LOG_LEVEL || "info",
  botInviteUrl: process.env.BOT_INVITE_URL || "",
  voteUrl: process.env.VOTE_URL || "",
  supportServer: process.env.SUPPORT_SERVER || "",
  brandColor: 0x9B59B6,
  errorColor: 0x922B21,
  successColor: 0x2D6A4F,
  neutralColor: 0x1a1a2e,
  embedFooter: process.env.EMBED_FOOTER || "Mourn",
};
