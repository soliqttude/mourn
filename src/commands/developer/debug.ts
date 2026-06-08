import { EmbedBuilder, codeBlock } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "debug",
  description: "(Dev) Show bot debug info.",
  category: "developer",
  aliases: ["botdebug", "info_dev"],
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🔧 Debug Info").addFields(
      { name: "Uptime", value: `${h}h ${m}m ${s}s`, inline: true },
      { name: "Guilds", value: `${ctx.client.guilds.cache.size}`, inline: true },
      { name: "Users", value: `${ctx.client.users.cache.size}`, inline: true },
      { name: "Heap Used", value: `${(mem.heapUsed/1024/1024).toFixed(2)} MB`, inline: true },
      { name: "Heap Total", value: `${(mem.heapTotal/1024/1024).toFixed(2)} MB`, inline: true },
      { name: "Node", value: process.version, inline: true },
    ).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
  },
};
