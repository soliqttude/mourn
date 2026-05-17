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

export const command: HybridCommand = {
  name: "botinfo",
  description: "Detailed stats about Bleed.",
  usage: "botinfo",
  examples: ["botinfo"],
  category: "custom",
  aliases: ["bi", "stats"],
  async execute(ctx) {
    const client  = ctx.client;
    const guilds  = client.guilds.cache.size;
    const users   = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const ping    = client.ws.ping;
    const uptime  = formatUptime(client.uptime ?? 0);
    const mem     = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const cmdCount = commands.size;

    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Bleed — Bot Info",
          thumbnail: client.user?.displayAvatarURL() ?? undefined,
          fields: [
            { name: "🌐  Servers",   value: guilds.toLocaleString(),  inline: true },
            { name: "👥  Users",     value: users.toLocaleString(),   inline: true },
            { name: "⚡  Ping",      value: `${ping}ms`,              inline: true },
            { name: "🕐  Uptime",    value: uptime,                   inline: true },
            { name: "💾  Memory",    value: `${mem} MB`,              inline: true },
            { name: "🛠️  Commands",  value: cmdCount.toLocaleString(), inline: true },
            { name: "👤  Developer", value: "geico (@udrs)",          inline: true },
            { name: "⚙️  Runtime",   value: `Node.js ${process.version}`, inline: true },
          ],
          page: "Bot Info",
        }),
      ],
    });
  },
};
