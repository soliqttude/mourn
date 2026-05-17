import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { eq, sql } from "drizzle-orm";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "giveall",
  description: "(Owner) Give all economy users in this server a coin amount.",
  usage: "giveall [amount]",
  examples: ["giveall"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["massreward", "giveveryone"],
  options: [
    { name: "amount", description: "Amount to give everyone", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[0] ?? "0");
    if (!amount || amount < 1) return ctx.reply({ embeds: [errorEmbed("Provide a valid amount.")] });

    const result = await db
      .update(economy)
      .set({ balance: sql`${economy.balance} + ${amount}` })
      .where(eq(economy.guildId, ctx.guild.id));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("💰 Mass Payout Complete")
          .setDescription(`Gave **$${amount.toLocaleString()}** to all economy users in **${ctx.guild.name}**.`)
          .setTimestamp(),
      ],
    });
  },
};
