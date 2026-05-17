import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "compare",
  description: "Compare your economy stats head-to-head with another user.",
  usage: "compare [user]",
  examples: ["compare"],
  category: "economy",
  guildOnly: true,
  aliases: ["vs", "statsvs"],
  options: [
    { name: "user", description: "User to compare against", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user") ?? null;
    const targetId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return ctx.reply({ content: "Provide a user to compare with." });
    if (targetId === ctx.user.id) return ctx.reply({ content: "You can't compare with yourself!" });

    const [myBal, theirBal] = await Promise.all([
      getBalance(ctx.guild.id, ctx.user.id),
      getBalance(ctx.guild.id, targetId),
    ]);
    const them = await ctx.client.users.fetch(targetId).catch(() => null);

    const myTotal = myBal.balance + myBal.bank;
    const theirTotal = theirBal.balance + theirBal.bank;
    const winner = myTotal > theirTotal ? ctx.user.username : myTotal < theirTotal ? (them?.username ?? targetId) : "Tie";

    const cmp = (a: number, b: number) => a > b ? "✅" : a < b ? "❌" : "🟡";

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle("⚔️ Economy Comparison")
          .setDescription([
            `**${ctx.user.username}** vs **${them?.username ?? targetId}**`,
            "",
            `🏆 **Richer:** ${winner}`,
          ].join("\n"))
          .addFields(
            { name: " ", value: `**${ctx.user.username}**`, inline: true },
            { name: " ", value: "**Stat**", inline: true },
            { name: " ", value: `**${them?.username ?? targetId}**`, inline: true },
            { name: " ", value: `${cmp(myBal.balance, theirBal.balance)} ${myBal.balance.toLocaleString()}`, inline: true },
            { name: " ", value: "👛 Wallet", inline: true },
            { name: " ", value: `${cmp(theirBal.balance, myBal.balance)} ${theirBal.balance.toLocaleString()}`, inline: true },
            { name: " ", value: `${cmp(myBal.bank, theirBal.bank)} ${myBal.bank.toLocaleString()}`, inline: true },
            { name: " ", value: "🏦 Bank", inline: true },
            { name: " ", value: `${cmp(theirBal.bank, myBal.bank)} ${theirBal.bank.toLocaleString()}`, inline: true },
            { name: " ", value: `${cmp(myTotal, theirTotal)} **${myTotal.toLocaleString()}**`, inline: true },
            { name: " ", value: "💰 Net Worth", inline: true },
            { name: " ", value: `${cmp(theirTotal, myTotal)} **${theirTotal.toLocaleString()}**`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • Economy` })
          .setTimestamp(),
      ],
    });
  },
};
