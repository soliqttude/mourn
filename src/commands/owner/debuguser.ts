import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance } from "../../features/economy.js";
import { db } from "../../db/index.js";
import { levels, warnings, blacklist, userItems } from "../../db/schema.js";
import { and, eq, count } from "drizzle-orm";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "debuguser",
  description: "(Owner) Dump full DB record for a user.",
  usage: "debuguser [user]",
  examples: ["debuguser"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["userdb", "dumpuser"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    if (!userId) return ctx.reply({ embeds: [errorEmbed("Provide a **user**.")] });

    const user = await ctx.client.users.fetch(userId).catch(() => null);
    const [eco, lvl, warnCount, caseCount, isBlacklisted] = await Promise.all([
      getBalance(ctx.guild.id, userId).catch(() => null),
      db.select().from(levels).where(and(eq(levels.guildId, ctx.guild.id), eq(levels.userId, userId))).then(r => r[0] ?? null).catch(() => null),
      db.select({ c: count() }).from(warnings).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.userId, userId))).then(r => r[0]?.c ?? 0).catch(() => 0),
      db.select().from(blacklist).where(eq(blacklist.userId, userId)).then(r => r.length > 0).catch(() => false),
    ]);

    const eb = new EmbedBuilder()
      .setColor(0x0f1923)
      .setTitle(`🔍 Debug — ${user?.tag ?? userId}`)
      .setThumbnail(user?.displayAvatarURL() ?? null)
      .addFields(
        { name: "🆔 User ID", value: `\`${userId}\``, inline: true },
        { name: "🤖 Bot", value: user?.bot ? "Yes" : "No", inline: true },
        { name: "⛔ Blacklisted", value: isBlacklisted ? "**YES**" : "No", inline: true },
        { name: "💰 Balance", value: eco ? `$${eco.balance.toLocaleString()}` : "N/A", inline: true },
        { name: "🏦 Bank", value: eco ? `$${eco.bank.toLocaleString()}` : "N/A", inline: true },
        { name: "📅 Last Daily", value: eco?.lastDaily ? `<t:${Math.floor(eco.lastDaily.getTime() / 1000)}:R>` : "Never", inline: true },
        { name: "⭐ Level", value: lvl ? `${lvl.level}` : "0", inline: true },
        { name: "✨ XP", value: lvl ? `${lvl.xp.toLocaleString()}` : "0", inline: true },
        { name: "📨 Last Msg", value: lvl?.lastMessageAt ? `<t:${Math.floor(lvl.lastMessageAt.getTime() / 1000)}:R>` : "N/A", inline: true },
        { name: "⚠️ Warnings", value: `${warnCount}`, inline: true },
        { name: "📋 Mod Cases", value: `${caseCount}`, inline: true },
      )
      .setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true } as any);
  },
};
