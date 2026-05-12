import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { topRichest } from "../../features/economy.js";
import { config } from "../../config.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export const command: HybridCommand = {
  name: "topgamblers",
  description: "See the richest members in this server (wallet + bank combined).",
  category: "economy",
  guildOnly: true,
  aliases: ["richlist", "topmoney", "wealthiest"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await topRichest(ctx.guild.id, 10);
    if (!rows.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("no economy data yet.")] });

    const lines = await Promise.all(rows.map(async (r, i) => {
      const user = await ctx.client.users.fetch(r.userId).catch(() => null);
      const name = user?.username ?? `<@${r.userId}>`;
      const medal = MEDALS[i] ?? `**${i + 1}.**`;
      const net = r.balance + r.bank;
      return `${medal} **${name}** — ${net.toLocaleString()} coins (💰 ${r.balance.toLocaleString()} + 🏦 ${r.bank.toLocaleString()})`;
    }));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle(`💎 ${ctx.guild.name} — wealth leaderboard`)
          .setDescription(lines.join("\n"))
          .setThumbnail(ctx.guild.iconURL() ?? null)
          .setFooter({ text: `${config.embedFooter} • economy` })
          .setTimestamp(),
      ],
    });
  },
};
