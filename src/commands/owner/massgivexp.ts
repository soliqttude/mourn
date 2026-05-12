import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levels } from "../../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "massgivexp",
  description: "(Owner) Give XP to all economy users in a server.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID", type: ApplicationCommandOptionType.String, required: true },
    { name: "amount", description: "XP to give each user", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id", true)!;
    const xp = ctx.getNumber("amount", true)!;
    if (xp <= 0 || xp > 100_000) return ctx.reply({ embeds: [errorEmbed("xp must be between 1 and 100,000.")] });

    const guild = ctx.client.guilds.cache.get(guildId);
    const rows = await db.select({ userId: levels.userId }).from(levels).where(eq(levels.guildId, guildId));

    if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no level data found for that guild.")] });

    await db.update(levels)
      .set({ xp: sql`${levels.xp} + ${xp}` })
      .where(eq(levels.guildId, guildId));

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.successColor)
          .setDescription(`✅ gave **${xp.toLocaleString()} xp** to **${rows.length}** users in **${guild?.name ?? guildId}**.`)
          .setFooter({ text: config.embedFooter })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
