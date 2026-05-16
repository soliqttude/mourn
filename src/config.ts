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
  brandColor: 0x111114,
  errorColor: 0xc0392b,
  successColor: 0x2a9d54,
  neutralColor: 0x111114,
  embedFooter: process.env.EMBED_FOOTER || "mourn",
};
