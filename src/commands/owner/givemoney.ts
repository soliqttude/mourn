import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "givemoney",
  description: "(Owner) Give any amount of coins to a user.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["addcoins", "givecoins", "godmode"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount to give", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = await ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[1] ?? "0");
    if (!userId || !amount || amount < 1) return ctx.reply({ content: "Provide a user and valid amount." });

    await addBalance(ctx.guild.id, userId, amount);
    const bal = await getBalance(ctx.guild.id, userId);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("💰 Money Given")
          .addFields(
            { name: "User", value: user?.tag ?? userId, inline: true },
            { name: "Amount Added", value: `+${amount.toLocaleString()} coins`, inline: true },
            { name: "New Balance", value: `${bal.balance.toLocaleString()} coins`, inline: true },
          )
          .setFooter({ text: `${config.embedFooter} • Owner Action` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
