import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import http from "node:http";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { runMigrations } from "./db/migrate.js";
import { loadCommands } from "./handlers/registry.js";
import { loadEvents } from "./handlers/events.js";
import { registerSlashCommands } from "./handlers/slashRegister.js";
import { startReminderLoop } from "./features/reminders.js";
import { startGiveawayLoop } from "./features/giveaway.js";
import { startTempBanLoop } from "./features/tempbans.js";
import { startAutoMessageLoop } from "./features/autoMessages.js";
import { startSocialNotificationLoop } from "./features/socialNotifications.js";
import { setupMusic } from "./features/music.js";

function startHealthServer() {
  const port = Number(process.env.PORT || 3000);
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Mourn is alive");
  });

  server.listen(port, "0.0.0.0", () => {
    logger.info(`Health server listening on port ${port}`);
  });
}

async function main() {
  startHealthServer();
  await runMigrations();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildPresences,
    ],
    partials: [
      Partials.Message, Partials.Channel, Partials.Reaction,
      Partials.GuildMember, Partials.User,
    ],
  });

  await loadCommands();
  await loadEvents(client);

  client.once("ready", async () => {
    logger.info(`✅ Logged in as ${client.user?.tag}`);
    client.user?.setPresence({
      activities: [{ name: `${config.defaultPrefix}help`, type: ActivityType.Watching }],
      status: "online",
    });
    if (client.application?.id) {
      await registerSlashCommands(client.application.id);
    }
    startReminderLoop(client);
    startGiveawayLoop(client);
    startTempBanLoop(client);
    startAutoMessageLoop(client);
    startSocialNotificationLoop(client);
    setupMusic(client);
  });

  process.on("unhandledRejection", (err) => { logger.error({ err }, "Unhandled rejection"); });
  process.on("uncaughtException", (err) => { logger.error({ err }, "Uncaught exception"); });

  await client.login(config.token);
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
