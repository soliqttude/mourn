import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { addBalance, getBalance } from "../../features/economy.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "richboy",
  description: "(Owner) Silently give someone an absurd amount of money.",
  usage: "richboy [user] [amount]",
  examples: ["richboy"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["moneybag", "jackpotgod"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Amount (default 1,000,000)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    if (!target) return ctx.reply({ embeds: [errorEmbed("Provide a **user**.")] });
    const amount = ctx.getNumber("amount") ?? (parseInt(ctx.args[1] ?? "1000000") || 1_000_000);

    await addBalance(ctx.guild.id, target.id, amount);
    const bal = await getBalance(ctx.guild.id, target.id);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd740)
          .setTitle("🤑 Rich Boy")
          .setDescription(`Gave **${target.tag}** a quiet **$${amount.toLocaleString()}**.\nNew balance: **$${bal.balance.toLocaleString()}**`)
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
