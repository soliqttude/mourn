import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "serverstats",
  description: "(Owner) Deep stats for every server the bot is in.",
  usage: "serverstats",
  examples: ["serverstats"],
  category: "owner",
  ownerOnly: true,
  aliases: ["guildstats", "allstats"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });

    const guilds = ctx.client.guilds.cache;
    let totalMembers = 0, totalBots = 0;
    const guildList: string[] = [];

    const guildArr = [...guilds.values()];
    for (const g of guildArr.slice(0, 20)) {
      const members = g.memberCount;
      const bots = g.members.cache.filter(m => m.user.bot).size;
      totalMembers += members;
      totalBots += bots;
      guildList.push(`**${g.name}** — ${members} members (${bots} bots) | ID: ${g.id}`);
    }

    const up = Math.floor((ctx.client.uptime ?? 0) / 1000);
    const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = up % 60;

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle("📊 Global Server Stats")
          .addFields(
            { name: "🌐 Total Servers", value: `${guilds.size}`, inline: true },
            { name: "👥 Cached Members", value: `${ctx.client.users.cache.size.toLocaleString()}`, inline: true },
            { name: "⚡ Latency", value: `${ctx.client.ws.ping}ms`, inline: true },
            { name: "⏱️ Uptime", value: `${h}h ${m}m ${s}s`, inline: true },
            { name: "🤖 Bot User", value: ctx.client.user?.tag ?? "Unknown", inline: true },
            { name: "📋 Servers (first 20)", value: guildList.join("\n") || "—" },
          )
          .setFooter({ text: `${config.embedFooter} • Owner Stats` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
