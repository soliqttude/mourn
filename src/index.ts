import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { runMigrations } from "./db/migrate.js";
import { loadCommands } from "./handlers/registry.js";
import { loadEvents } from "./handlers/events.js";
import { registerSlashCommands } from "./handlers/slashRegister.js";
import { startReminderLoop } from "./features/reminders.js";
import { startGiveawayLoop } from "./features/giveaway.js";
import { startTempBanLoop } from "./features/tempbans.js";
import { startDropLoop } from "./features/drops.js";
import { startAutoMessageLoop } from "./features/autoMessages.js";

async function main() {
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
    startDropLoop(client);
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
