import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "fakeping",
  description: "(Owner) Pretend the bot is lagging at 9999ms, then snap back.",
  usage: "fakeping",
  examples: ["fakeping"],
  category: "owner",
  ownerOnly: true,
  aliases: ["lagspike"],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const msg = await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("🏓 Pong!")
          .addFields(
            { name: "Bot Latency", value: "**9999ms** 🔴", inline: true },
            { name: "API Latency", value: "**8472ms** 🔴", inline: true },
          )
          .setDescription("⚠️ Experiencing high latency. Attempting to reconnect...")
          .setTimestamp(),
      ],
    });
    await new Promise(r => setTimeout(r, 4000));
    const realPing = ctx.client.ws.ping;
    await (msg as any).edit?.({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("🏓 Pong!")
          .addFields(
            { name: "Bot Latency", value: `**${realPing}ms** 🟢`, inline: true },
            { name: "API Latency", value: `**${Math.floor(realPing * 0.8)}ms** 🟢`, inline: true },
          )
          .setDescription("Connection stabilized.")
          .setTimestamp(),
      ],
    }).catch(() => {});
  },
};
