import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { eq, and } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { economy, levels, warnings, modCases, blacklist } from "../../db/schema.js";
import { ownerState } from "../../lib/ownerState.js";

export const command: HybridCommand = {
  name: "expose",
  description: "(Owner only) Pull everything the bot knows about a user across all servers.",
  usage: "expose [user_id]",
  examples: ["expose"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "user_id", description: "User ID to expose", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const userId = ctx.getString("user_id", true) ?? ctx.rawArgs.trim();
    if (!userId) return ctx.reply({ content: "Provide a user ID." });
    await ctx.defer(true);
    const user = await ctx.client.users.fetch(userId).catch(() => null);
    const guilds = ctx.client.guilds.cache.filter(g => g.members.cache.has(userId));
    let totalBalance = 0, totalBank = 0, totalXp = 0, totalWarnings = 0, totalCases = 0;
    for (const [guildId] of guilds) {
      const eco = await db.query.economy.findFirst({ where: and(eq(economy.guildId, guildId), eq(economy.userId, userId)) });
      const lvl = await db.query.levels.findFirst({ where: and(eq(levels.guildId, guildId), eq(levels.userId, userId)) });
      const warns = await db.select().from(warnings).where(and(eq(warnings.guildId, guildId), eq(warnings.userId, userId)));
      const cases = await db.select().from(modCases).where(and(eq(modCases.guildId, guildId), eq(modCases.userId, userId)));
      if (eco) { totalBalance += eco.balance; totalBank += eco.bank; }
      if (lvl) totalXp += lvl.xp;
      totalWarnings += warns.length;
      totalCases += cases.length;
    }
    const bl = await db.query.blacklist.findFirst({ where: eq(blacklist.userId, userId) });
    const isLocked = ownerState.lockedUsers.has(userId);
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`🔍 Expose — ${user?.tag ?? userId}`)
      .setThumbnail(user?.displayAvatarURL() ?? null)
      .addFields(
        { name: "User ID", value: userId, inline: true },
        { name: "Created", value: user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` : "Unknown", inline: true },
        { name: "Shared Servers", value: `${guilds.size}`, inline: true },
        { name: "Total Balance", value: `$${totalBalance.toLocaleString()}`, inline: true },
        { name: "Total Bank", value: `$${totalBank.toLocaleString()}`, inline: true },
        { name: "Total XP", value: totalXp.toLocaleString(), inline: true },
        { name: "Warnings", value: `${totalWarnings}`, inline: true },
        { name: "Mod Cases", value: `${totalCases}`, inline: true },
        { name: "Bot Status", value: [
          bl ? `🚫 **Blacklisted** — ${bl.reason ?? "No reason"}` : "✅ Not blacklisted",
          isLocked ? "🔒 **Locked out**" : "🔓 Not locked",
        ].join("\n"), inline: false },
      )
      .setFooter({ text: config.embedFooter })
      .setTimestamp();
    return ctx.reply({ embeds: [eb] });
  },
};
