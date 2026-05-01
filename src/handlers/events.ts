import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Client } from "discord.js";
import { logger } from "../lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadEvents(client: Client): Promise<void> {
  const dir = join(__dirname, "..", "events");
  const files = readdirSync(dir).filter(
    (f) => (f.endsWith(".js") || f.endsWith(".ts")) && !f.endsWith(".d.ts")
  );
  let count = 0;
  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(join(dir, file)).href);
      const event = mod.event ?? mod.default;
      if (!event?.name || !event.execute) continue;
      if (event.once) {
        client.once(event.name, (...args: unknown[]) =>
          event.execute(client, ...args)
        );
      } else {
        client.on(event.name, (...args: unknown[]) =>
          event.execute(client, ...args)
        );
      }
      count++;
    } catch (err) {
      logger.error({ err, file }, "Failed to load event");
    }
  }
  logger.info(`Loaded ${count} events.`);
}

export interface EventHandler<E extends string = string> {
  name: E;
  once?: boolean;
  execute: (client: Client, ...args: any[]) => unknown | Promise<unknown>;
}
