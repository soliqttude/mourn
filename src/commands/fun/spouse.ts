import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { marriages } from "../../db/schema.js";
import { or, eq } from "drizzle-orm";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "spouse",
  aliases: ["partner", "waifu", "hubby"],
  description: "See who you're married to.",
  usage: "spouse",
  examples: ["spouse"],
  category: "fun",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await db.select().from(marriages).where(
      or(eq(marriages.user1Id, ctx.user.id), eq(marriages.user2Id, ctx.user.id))
    );
    const marriage = rows.find(r => r.guildId === ctx.guild!.id);
    if (!marriage) {
      return ctx.reply({ embeds: [errorEmbed("you're not married. use `/marry` to propose to someone.")] });
    }
    const partnerId = marriage.user1Id === ctx.user.id ? marriage.user2Id : marriage.user1Id;
    const partner = await ctx.client.users.fetch(partnerId).catch(() => null);
    const since = Math.floor(marriage.marriedAt.getTime() / 1000);
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("💍 married")
          .setDescription(`you're married to **${partner?.username ?? `<@${partnerId}>`}**`)
          .addFields(
            { name: "partner", value: `<@${partnerId}>`, inline: true },
            { name: "married since", value: `<t:${since}:D>`, inline: true },
            { name: "time together", value: `<t:${since}:R>`, inline: true },
          )
          .setThumbnail(partner?.displayAvatarURL() ?? null)
          .setFooter({ text: `${config.embedFooter} • fun` })
          .setTimestamp(),
      ],
    });
  },
};
