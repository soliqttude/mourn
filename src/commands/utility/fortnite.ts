import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed, successEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { fortniteWatches } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";

const BASE = "https://fortnite-api.com/v2";

async function fnFetch<T>(path: string): Promise<T | null> {
  try {
    const apiKey = process.env.FORTNITE_API_KEY ?? "";
    const headers: Record<string, string> = apiKey ? { Authorization: apiKey } : {};
    const res = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.data ?? null;
  } catch { return null; }
}

export const command: HybridCommand = {
  name: "fortnite",
  aliases: ["fn"],
  description: "Fortnite tools. Subcommands: shop, item, stats, watch, unwatch, watching",
  category: "utility",
  guildOnly: false,
  usage: "fortnite [shop|item|stats|watch|unwatch|watching] [args]",
  examples: ["fortnite shop", "fortnite item Renegade Raider", "fortnite stats Ninja"],
  options: [
    { name: "subcommand", description: "shop | item | stats | watch | unwatch | watching", type: ApplicationCommandOptionType.String, required: true },
    { name: "query", description: "Item name, player name, etc.", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const query = ctx.getString("query") ?? ctx.args.slice(1).join(" ");

    if (sub === "shop") {
      await ctx.defer();
      const shop = await fnFetch<any>("/shop?language=en");
      if (!shop) return ctx.reply({ embeds: [errorEmbed("failed to fetch fortnite shop.")] });
      const items = shop.featured?.entries ?? shop.entries ?? [];
      const top10 = items.slice(0, 10);
      const lines = top10.map((e: any) => {
        const item = e.items?.[0];
        const name = item?.name ?? "Unknown";
        const price = e.finalPrice ?? e.regularPrice ?? 0;
        const rarity = item?.rarity?.displayValue ?? "";
        return `**${name}** — ${price} V-Bucks ${rarity ? `*(${rarity})*` : ""}`;
      });
      const embed = new EmbedBuilder()
        .setColor(config.brandColor)
        .setTitle("Fortnite Item Shop")
        .setDescription(lines.join("\n") || "Shop is empty.")
        .setFooter({ text: `${items.length} items total` })
        .setTimestamp();
      return ctx.reply({ embeds: [embed] });
    }

    if (sub === "item") {
      if (!query) return ctx.reply({ embeds: [errorEmbed("provide an item name.")] });
      await ctx.defer();
      const results = await fnFetch<any[]>(`/cosmetics/br/search/all?name=${encodeURIComponent(query)}&language=en`);
      if (!results?.length) return ctx.reply({ embeds: [errorEmbed(`no item found for \`${query}\`.`)] });
      const item = results[0];
      const embed = new EmbedBuilder()
        .setColor(config.brandColor)
        .setTitle(item.name)
        .setDescription(`**type:** ${item.type?.displayValue ?? "unknown"}\n**rarity:** ${item.rarity?.displayValue ?? "unknown"}\n**set:** ${item.set?.value ?? "none"}\n**description:** ${item.description ?? "—"}`)
        .setThumbnail(item.images?.smallIcon ?? null)
        .setImage(item.images?.featured ?? item.images?.icon ?? null)
        .setFooter({ text: `ID: ${item.id}` });
      if (item.introduction) embed.addFields({ name: "introduced in", value: `Chapter ${item.introduction.chapter} Season ${item.introduction.season}`, inline: true });
      return ctx.reply({ embeds: [embed] });
    }

    if (sub === "stats") {
      if (!query) return ctx.reply({ embeds: [errorEmbed("provide a player name.")] });
      await ctx.defer();
      const stats = await fnFetch<any>(`/stats/br/v2?name=${encodeURIComponent(query)}&image=all`);
      if (!stats) return ctx.reply({ embeds: [errorEmbed(`no stats found for \`${query}\`. (player must have public stats)`)] });
      const all = stats.stats?.all?.overall;
      const embed = new EmbedBuilder()
        .setColor(config.brandColor)
        .setAuthor({ name: stats.account?.name ?? query })
        .setTitle("Fortnite Stats — All Modes")
        .setThumbnail(stats.image ?? null)
        .addFields(
          { name: "wins", value: String(all?.wins ?? 0), inline: true },
          { name: "kills", value: String(all?.kills ?? 0), inline: true },
          { name: "matches", value: String(all?.matches ?? 0), inline: true },
          { name: "win rate", value: `${((all?.wins / (all?.matches || 1)) * 100).toFixed(1)}%`, inline: true },
          { name: "K/D", value: `${(all?.kd ?? 0).toFixed(2)}`, inline: true },
          { name: "score", value: String(all?.score ?? 0), inline: true },
        );
      return ctx.reply({ embeds: [embed] });
    }

    if (sub === "watch") {
      if (!query) return ctx.reply({ embeds: [errorEmbed("provide a cosmetic name to watch.")] });
      const existing = await db.select().from(fortniteWatches).where(and(eq(fortniteWatches.userId, ctx.user.id), eq(fortniteWatches.cosmetic, query.toLowerCase())));
      if (existing.length) return ctx.reply({ embeds: [errorEmbed(`you're already watching \`${query}\`.`)] });
      await db.insert(fortniteWatches).values({ userId: ctx.user.id, cosmetic: query.toLowerCase() });
      return ctx.reply({ embeds: [successEmbed(`i'll notify you when **${query}** appears in the shop.`)] });
    }

    if (sub === "unwatch") {
      if (!query) return ctx.reply({ embeds: [errorEmbed("provide a cosmetic name to unwatch.")] });
      await db.delete(fortniteWatches).where(and(eq(fortniteWatches.userId, ctx.user.id), eq(fortniteWatches.cosmetic, query.toLowerCase())));
      return ctx.reply({ embeds: [successEmbed(`removed \`${query}\` from your watch list.`)] });
    }

    if (sub === "watching") {
      const rows = await db.select().from(fortniteWatches).where(eq(fortniteWatches.userId, ctx.user.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("you're not watching any cosmetics.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Your Fortnite Watches", description: rows.map(r => `• ${r.cosmetic}`).join("\n") })] });
    }

    return ctx.reply({ embeds: [brandEmbed({ description: "**subcommands:** shop, item, stats, watch, unwatch, watching" })] });
  },
};
