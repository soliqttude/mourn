import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "botstats",
  description: "(Owner only) Full bot health and resource dashboard.",
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const mem = process.memoryUsage();
    const up = process.uptime();
    const d = Math.floor(up / 86400);
    const h = Math.floor((up % 86400) / 3600);
    const m = Math.floor((up % 3600) / 60);
    const s = Math.floor(up % 60);
    const totalUsers = ctx.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const totalChannels = ctx.client.channels.cache.size;
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle("📊 Bot Health Dashboard")
      .setThumbnail(ctx.client.user?.displayAvatarURL() ?? null)
      .addFields(
        { name: "🌐 Servers", value: ctx.client.guilds.cache.size.toLocaleString(), inline: true },
        { name: "👥 Users", value: totalUsers.toLocaleString(), inline: true },
        { name: "📺 Channels", value: totalChannels.toLocaleString(), inline: true },
        { name: "⏱ Uptime", value: `${d}d ${h}h ${m}m ${s}s`, inline: true },
        { name: "🏓 Ping", value: `${ctx.client.ws.ping}ms`, inline: true },
        { name: "📦 Node.js", value: process.version, inline: true },
        { name: "🧠 Heap Used", value: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`, inline: true },
        { name: "🧠 Heap Total", value: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`, inline: true },
        { name: "💾 RSS", value: `${Math.round(mem.rss / 1024 / 1024)}MB`, inline: true },
      )
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
