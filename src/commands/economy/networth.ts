import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "networth",
  description: "See your total wealth — wallet + bank combined.",
  category: "economy",
  guildOnly: true,
  aliases: ["nw", "wealth", "total"],
  options: [
    { name: "user", description: "Check another user's net worth", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "") ?? ctx.user.id;
    const user = userId === ctx.user.id ? ctx.user : await ctx.client.users.fetch(userId).catch(() => null);

    const bal = await getBalance(ctx.guild.id, userId);
    const total = bal.balance + bal.bank;
    const ratio = total > 0 ? Math.round((bal.bank / total) * 100) : 0;

    const bar = (filled: number, total: number, size = 20) => {
      const f = Math.round((filled / total) * size) || 0;
      return "█".repeat(f) + "░".repeat(size - f);
    };

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle(`💰 Net Worth — ${user?.username ?? userId}`)
          .setThumbnail(user?.displayAvatarURL() ?? null)
          .addFields(
            { name: "👛 Wallet", value: `${bal.balance.toLocaleString()} coins`, inline: true },
            { name: "🏦 Bank", value: `${bal.bank.toLocaleString()} coins`, inline: true },
            { name: "💎 Total", value: `**${total.toLocaleString()} coins**`, inline: true },
            {
              name: "Wallet vs Bank",
              value: `\`${bar(bal.balance, total)}\` ${100 - ratio}% wallet / ${ratio}% bank`,
            },
          )
          .setFooter({ text: `${config.embedFooter} • Economy` })
          .setTimestamp(),
      ],
    });
  },
};
