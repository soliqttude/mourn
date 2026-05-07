import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, removeBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "takemoney",
  description: "(Owner) Remove coins from a user's wallet.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["removecoins", "takecoins"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount to take (or 'all')", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    const rawAmount = ctx.getString("amount") ?? ctx.args[1];
    if (!userId || !rawAmount) return ctx.reply({ content: "Provide a user and amount." });

    const bal = await getBalance(ctx.guild.id, userId);
    const amount = rawAmount === "all" ? bal.balance : parseInt(rawAmount);
    if (!amount || amount < 1) return ctx.reply({ content: "Invalid amount." });

    const actual = Math.min(amount, bal.balance);
    if (actual > 0) await removeBalance(ctx.guild.id, userId, actual);
    const newBal = await getBalance(ctx.guild.id, userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("💸 Money Taken")
          .addFields(
            { name: "User", value: user?.tag ?? userId, inline: true },
            { name: "Removed", value: `-${actual.toLocaleString()} coins`, inline: true },
            { name: "New Balance", value: `${newBal.balance.toLocaleString()} coins`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
