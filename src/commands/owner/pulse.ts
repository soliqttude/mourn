import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { errorEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

/**
 * ,pulse
 * Live bot health diagnostic — memory, uptime, cache, active owner features.
 * Owner-only. Ephemeral on slash.
 */
export const command: HybridCommand = {
  name: "pulse",
  description: "(Owner) Live bot diagnostic — memory, uptime, cache, active owner modes.",
  usage: "pulse",
  examples: ["pulse"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("not yours.")], ephemeral: true } as any);
    }

    const mem      = process.memoryUsage();
    const uptime   = formatUptime(process.uptime() * 1000);
    const client   = ctx.client;

    const guilds   = client.guilds.cache.size;
    const users    = client.guilds.cache.reduce((n, g) => n + g.memberCount, 0);
    const channels = client.channels.cache.size;
    const ping     = Math.round(client.ws.ping);

    // Active owner features
    const activeFeatures: string[] = [];
    if (ownerState.ghostMode)          activeFeatures.push("👻 ghost mode");
    if (ownerState.maintenanceMode)    activeFeatures.push("🔧 maintenance");
    if (ownerState.fakeLagActive)      activeFeatures.push("🐌 fake lag");
    if (ownerState.hauntedUsers.size)  activeFeatures.push(`🪄 haunting ${ownerState.hauntedUsers.size} user(s)`);
    if (ownerState.trolledUsers.size)  activeFeatures.push(`😈 trolling ${ownerState.trolledUsers.size} user(s)`);
    if (ownerState.watchedUsers.size)  activeFeatures.push(`👁️ watching ${ownerState.watchedUsers.size} user(s)`);
    if (ownerState.lockedUsers.size)   activeFeatures.push(`🔒 locked ${ownerState.lockedUsers.size} user(s)`);
    if (ownerState.statusRotation.length) activeFeatures.push(`🔄 status rotation (${ownerState.statusRotation.length} entries)`);

    const recentErrors   = ownerState.errorLog.length;
    const recentCmds     = ownerState.commandLog.length;
    const lastCmd        = ownerState.commandLog[0]
      ? `\`${ownerState.commandLog[0].command}\` by **${ownerState.commandLog[0].username}**`
      : "none";
    const lastErr        = ownerState.errorLog[0]?.message.slice(0, 60) ?? "none";

    const eb = new EmbedBuilder()
      .setColor(0x111114)
      .setAuthor({ name: `⚡  pulse  ·  ${client.user?.username ?? "bot"}`, iconURL: client.user?.displayAvatarURL() ?? undefined })
      .addFields(
        {
          name: "⏱  uptime",
          value: uptime,
          inline: true,
        },
        {
          name: "🏓  ws ping",
          value: `${ping}ms`,
          inline: true,
        },
        {
          name: "💾  memory",
          value: `rss ${formatBytes(mem.rss)}\nheap ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
          inline: true,
        },
        {
          name: "🌐  cache",
          value: `${guilds} guilds  ·  ${users.toLocaleString()} members  ·  ${channels} channels`,
          inline: false,
        },
        {
          name: "📋  command log",
          value: `${recentCmds} entries — last: ${lastCmd}`,
          inline: false,
        },
        {
          name: "🚨  error log",
          value: recentErrors ? `${recentErrors} errors — last: \`${lastErr}\`` : "clean ✅",
          inline: false,
        },
        {
          name: "🛠  active owner features",
          value: activeFeatures.length ? activeFeatures.join("\n") : "none",
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: config.embedFooter });

    return ctx.reply({ embeds: [eb], ephemeral: true } as any);
  },
};
