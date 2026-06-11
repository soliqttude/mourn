import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "bankrupt",
  description: "(Owner) Wipe a user's balance to zero.",
  usage: "bankrupt [user]",
  examples: ["bankrupt"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["wipeuser", "zeroval"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    if (!target) return ctx.reply({ embeds: [errorEmbed("Provide a **user**.")] });

    await db.update(economy)
      .set({ balance: 0, bank: 0 })
      .where(and(eq(economy.guildId, ctx.guild.id), eq(economy.userId, target.id)));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff1744)
          .setTitle("📉 Bankrupt")
          .setDescription(`**${target.tag}** has been financially obliterated. Balance and bank wiped to $0.`)
          .setThumbnail(target.displayAvatarURL())
          .setTimestamp(),
      ],
    });
  },
};
