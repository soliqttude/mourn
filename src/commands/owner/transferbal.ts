import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, addBalance, removeBalance } from "../../features/economy.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "transferbal",
  description: "(Owner) Transfer coins from one user to another.",
  usage: "transferbal [from] [to] [amount]",
  examples: ["transferbal"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["movemoney", "movebal"],
  options: [
    { name: "from", description: "Source user", type: ApplicationCommandOptionType.User, required: true },
    { name: "to", description: "Destination user", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const fromUser = await ctx.getUser("from");
    const toUser = await ctx.getUser("to");
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[2] ?? "0");
    if (!fromUser || !toUser || !amount || amount < 1)
      return ctx.reply({ embeds: [errorEmbed("Provide from, to, and amount.")] });

    const fromBal = await getBalance(ctx.guild.id, fromUser.id);
    await removeBalance(ctx.guild.id, fromUser.id, amount);
    await addBalance(ctx.guild.id, toUser.id, amount);
    const toBal = await getBalance(ctx.guild.id, toUser.id);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("💸 Balance Transferred")
          .addFields(
            { name: "From", value: `${fromUser.tag}\n~~$${fromBal.balance.toLocaleString()}~~ → $${(fromBal.balance - amount).toLocaleString()}`, inline: true },
            { name: "Amount", value: `**$${amount.toLocaleString()}**`, inline: true },
            { name: "To", value: `${toUser.tag}\n$${(toBal.balance).toLocaleString()}`, inline: true },
          ).setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
