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
  felonInvite: "https://discord.gg/gx9zk66NPp",
  brandColor: 0x8b0000,
  errorColor: 0xff3333,
  successColor: 0x00b894,
  neutralColor: 0x0a0a0a,
  embedFooter: "Mourn",
};
