import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { economy, levels, blacklist } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

function msToAge(ms: number): string {
  const d = Math.floor(ms / 86400000);
  if (d >= 365) return `${Math.floor(d / 365)}y ${Math.floor((d % 365) / 30)}mo`;
  if (d >= 30)  return `${Math.floor(d / 30)}mo ${d % 30}d`;
  return `${d}d`;
}

export const command: HybridCommand = {
  name: "lookup",
  aliases: ["userinfo2", "investigate", "stalk"],
  description: "(Owner only) Deep-dive on any user by ID — servers, economy, level, blacklist status.",
  usage: "lookup <user_id>",
  examples: ["lookup 123456789012345678"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    const userId = ctx.args[0]?.replace(/\D/g, "") ?? ctx.getString("user_id") ?? "";
    if (!userId) return ctx.reply({ content: "provide a user id." });

    let user;
    try {
      user = await ctx.client.users.fetch(userId, { force: true });
    } catch {
      return ctx.reply({ content: `couldn't find a Discord user with id \`${userId}\`.` });
    }

    // Mutual servers
    const mutualGuilds = ctx.client.guilds.cache
      .filter((g) => g.members.cache.has(userId))
      .sort((a, b) => b.memberCount - a.memberCount);

    // Economy rows across all guilds
    const ecoRows = await db.select().from(economy).where(eq(economy.userId, userId)).catch(() => []);
    const totalCoins = ecoRows.reduce((sum, r) => sum + Number(r.wallet ?? 0) + Number(r.bank ?? 0), 0);

    // Level rows
    const lvlRows = await db.select().from(levels).where(eq(levels.userId, userId)).catch(() => []);
    const topLevel = lvlRows.length ? Math.max(...lvlRows.map((r) => r.level ?? 0)) : null;

    // Blacklist status
    const blRow = await db.select().from(blacklist).where(eq(blacklist.userId, userId)).catch(() => []);
    const isBlacklisted = blRow.length > 0;

    const createdAt = user.createdAt;
    const age = msToAge(Date.now() - createdAt.getTime());
    const flags = user.flags?.toArray() ?? [];

    const eb = new EmbedBuilder()
      .setColor(isBlacklisted ? 0xED4245 : config.brandColor)
      .setAuthor({ name: `lookup — ${user.tag}`, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "Account",
          value: [
            `**ID:** \`${user.id}\``,
            `**Created:** <t:${Math.floor(createdAt.getTime() / 1000)}:D> (${age} ago)`,
            `**Bot:** ${user.bot ? "yes" : "no"}`,
            flags.length ? `**Badges:** ${flags.map((f) => `\`${f}\``).join(", ")}` : "",
          ].filter(Boolean).join("\n"),
          inline: false,
        },
        {
          name: `Mutual Servers (${mutualGuilds.size})`,
          value: mutualGuilds.size
            ? mutualGuilds
                .first(8)
                .map((g) => `• **${g.name}** (${g.memberCount.toLocaleString()} members)`)
                .join("\n") + (mutualGuilds.size > 8 ? `\n*+${mutualGuilds.size - 8} more*` : "")
            : "none cached — try after fetching members",
          inline: false,
        },
        {
          name: "Economy",
          value: ecoRows.length
            ? `**Total coins:** ${totalCoins.toLocaleString()} across ${ecoRows.length} server(s)`
            : "no economy data",
          inline: true,
        },
        {
          name: "Levels",
          value: topLevel !== null
            ? `**Highest level:** ${topLevel} across ${lvlRows.length} server(s)`
            : "no level data",
          inline: true,
        },
        {
          name: "Blacklist",
          value: isBlacklisted
            ? `⛔ **blacklisted** — ${blRow[0]?.reason ?? "no reason"}`
            : "✅ clean",
          inline: false,
        },
      )
      .setFooter({ text: `Mourn • owner lookup` })
      .setTimestamp();

    const banner = await user.fetch(true).then((u) => u.bannerURL({ size: 512 }) ?? null).catch(() => null);
    if (banner) eb.setImage(banner);

    return ctx.reply({ embeds: [eb] });
  },
};
