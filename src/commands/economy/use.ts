import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getEconomy, addBuff, getActiveBuff } from "../../features/economy.js";
import { db } from "../../db/index.js";
import { shopItems, userItems } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

const BUFF_KEYWORDS: Record<string, { buffType: string; multiplier: number; durationMs: number; label: string }> = {
  "lucky charm":      { buffType: "luck",   multiplier: 1.5, durationMs: 60 * 60 * 1000, label: "🍀 luck buff (1.5× for 1h)" },
  "xp potion":        { buffType: "xp",     multiplier: 2.0, durationMs: 60 * 60 * 1000, label: "⚡ XP boost (2× for 1h)" },
  "coin multiplier":  { buffType: "coins",  multiplier: 1.5, durationMs: 60 * 60 * 1000, label: "🪙 coin multiplier (1.5× for 1h)" },
  "fishing rod":      { buffType: "fish",   multiplier: 2.0, durationMs: 30 * 60 * 1000, label: "🎣 fishing boost (2× for 30m)" },
  "shield":           { buffType: "shield", multiplier: 1.0, durationMs: 4 * 60 * 60 * 1000, label: "🛡️ rob shield (4h protection)" },
};

function matchBuff(name: string) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(BUFF_KEYWORDS)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

export const command: HybridCommand = {
  name: "use",
  description: "Use an item from your inventory.",
  usage: "use [item]",
  examples: ["use"],
  category: "economy",
  guildOnly: true,
  options: [
    { name: "item", description: "Item name to use", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const itemName = ctx.getString("item", true) ?? ctx.rawArgs?.trim();
    if (!itemName) return ctx.reply({ embeds: [errorEmbed("specify an item name.")] });

    await getEconomy(ctx.guild.id, ctx.user.id);

    const items = await db.select({ ui: userItems, si: shopItems })
      .from(userItems)
      .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
      .where(and(eq(userItems.guildId, ctx.guild.id), eq(userItems.userId, ctx.user.id)));

    const match = items.find(r => r.si.name.toLowerCase().includes(itemName.toLowerCase()));
    if (!match) return ctx.reply({ embeds: [errorEmbed(`you don't have **${itemName}** in your inventory.`)] });

    const buff = matchBuff(match.si.name);
    if (!buff) {
      return ctx.reply({ embeds: [errorEmbed(`**${match.si.name}** can't be used — it has no active effect. items with effects include: lucky charm, xp potion, coin multiplier, fishing rod, shield.`)] });
    }

    const existing = await getActiveBuff(ctx.guild.id, ctx.user.id, buff.buffType);
    if (existing) {
      const expiresTs = Math.floor(existing.expiresAt.getTime() / 1000);
      return ctx.reply({ embeds: [errorEmbed(`you already have a **${buff.buffType}** buff active until <t:${expiresTs}:R>.`)] });
    }

    await addBuff(ctx.guild.id, ctx.user.id, buff.buffType, buff.multiplier, buff.durationMs);

    if (match.ui.quantity <= 1) {
      await db.delete(userItems).where(and(eq(userItems.guildId, ctx.guild.id), eq(userItems.userId, ctx.user.id), eq(userItems.itemId, match.si.id)));
    } else {
      await db.update(userItems).set({ quantity: match.ui.quantity - 1 }).where(and(eq(userItems.guildId, ctx.guild.id), eq(userItems.userId, ctx.user.id), eq(userItems.itemId, match.si.id)));
    }

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.successColor)
          .setTitle("✅ item used")
          .setDescription(`**${match.si.name}** consumed.\n\n${buff.label}`)
          .setFooter({ text: `${config.embedFooter} • economy` })
          .setTimestamp(),
      ],
    });
  },
};
