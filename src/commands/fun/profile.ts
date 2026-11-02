import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getRep } from "../../features/reputation.js";
import { userProfiles } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { levels, marriages, userMood } from "../../db/schema.js";
import { and, eq, or } from "drizzle-orm";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "profile",
  description: "View your full profile card.",
  usage: "profile [user]",
  examples: ["profile"],
  category: "fun",
  guildOnly: true,
  aliases: ["card", "stats"],
  options: [
    { name: "user", description: "User to view", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const member = await ctx.guild.members.fetch(target.id).catch(() => null);

    const [rep, levelRow, marriageRows, moodRow, profileRow] = await Promise.all([
      getRep(ctx.guild.id, target.id),
      db.select().from(levels).where(and(eq(levels.guildId, ctx.guild.id), eq(levels.userId, target.id))).then(r => r[0] ?? null),
      db.select().from(marriages).where(or(eq(marriages.user1Id, target.id), eq(marriages.user2Id, target.id))).then(r => r.filter(m => m.guildId === ctx.guild!.id)),
      db.select().from(userMood).where(and(eq(userMood.guildId, ctx.guild.id), eq(userMood.userId, target.id))).then(r => r[0] ?? null),
      db.select().from(userProfiles).where(eq(userProfiles.userId, target.id)).then(r => r[0] ?? null),
    ]);

    const marriage = marriageRows[0] ?? null;
    const partnerId = marriage ? (marriage.user1Id === target.id ? marriage.user2Id : marriage.user1Id) : null;
    const partner = partnerId ? await ctx.client.users.fetch(partnerId).catch(() => null) : null;

    const joinTs = member?.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
          .setThumbnail(target.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "⭐ level", value: levelRow ? `level **${levelRow.level}** (${levelRow.xp.toLocaleString()} xp)` : "level 0", inline: true },
            { name: "👏 rep", value: `${rep.repCount} rep`, inline: true },
            { name: "💍 partner", value: partner ? `<@${partnerId}>` : "single", inline: true },
            { name: "📅 joined", value: joinTs ? `<t:${joinTs}:D>` : "unknown", inline: true },
            { name: "😶 mood", value: moodRow?.mood ?? "not set", inline: true },
            { name: "📝 bio", value: (profileRow as any)?.bio ?? "not set", inline: false },
          )
          .setFooter({ text: `${config.embedFooter} • fun` })
          .setTimestamp(),
      ],
    });
  },
};
