import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { commands } from "../../handlers/registry.js";

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatMemory(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const command: HybridCommand = {
  name: "botinfo",
  description: "Detailed stats about Mourn.",
  category: "custom",
  aliases: ["bi", "stats"],
  async execute(ctx) {
    const client = ctx.client;
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const channels = client.channels.cache.size;
    const uptime = formatUptime(client.uptime ?? 0);
    const mem = formatMemory(process.memoryUsage().heapUsed);
    const ping = client.ws.ping;
    const cmdCount = commands.size;
    const nodeVersion = process.version;

    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "mourn — stats.",
          fields: [
            { name: "servers", value: guilds.toLocaleString(), inline: true },
            { name: "users", value: users.toLocaleString(), inline: true },
            { name: "channels", value: channels.toLocaleString(), inline: true },
            { name: "commands", value: cmdCount.toLocaleString(), inline: true },
            { name: "ping", value: `${ping}ms`, inline: true },
            { name: "uptime", value: uptime, inline: true },
            { name: "memory", value: mem, inline: true },
            { name: "node.js", value: nodeVersion, inline: true },
            { name: "developer", value: "geico (@udrs)", inline: true },
          ],
          page: "Bot Info",
        }),
      ],
    });
  },
};
