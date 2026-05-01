import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Collection } from "discord.js";
import type { HybridCommand } from "../lib/command.js";
import { logger } from "../lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const commands = new Collection<string, HybridCommand>();
export const aliases = new Collection<string, string>();

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      out.push(...(await walk(p)));
    } else if (
      (entry.endsWith(".js") || entry.endsWith(".ts")) &&
      !entry.endsWith(".d.ts")
    ) {
      out.push(p);
    }
  }
  return out;
}

export async function loadCommands(): Promise<void> {
  const root = join(__dirname, "..", "commands");
  const files = await walk(root);
  for (const file of files) {
    try {
      const url = pathToFileURL(file).href;
      const mod = await import(url);
      const cmd: HybridCommand | undefined = mod.command ?? mod.default;
      if (!cmd?.name || !cmd.execute) continue;
      commands.set(cmd.name.toLowerCase(), cmd);
      for (const alias of cmd.aliases ?? []) {
        aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
      }
    } catch (err) {
      logger.error({ err, file }, "Failed to load command");
    }
  }
  logger.info(`Loaded ${commands.size} commands.`);
}

export function findCommand(query: string): HybridCommand | null {
  const lower = query.toLowerCase();
  return (
    commands.get(lower) ??
    commands.get(aliases.get(lower) ?? "") ??
    null
  );
}
