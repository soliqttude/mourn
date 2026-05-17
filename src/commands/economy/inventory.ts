import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { userItems, shopItems } from "../../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";

export const command: HybridCommand = {
  name: "inventory",
  description: "View your owned items.",
  usage: "inventory",
  examples: ["inventory"],
  category: "economy",
  aliases: ["inv"],
  guildOnly: true,
  options: [],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const owned = await db.select({ itemId: userItems.itemId, quantity: userItems.quantity })
      .from(userItems)
      .where(and(eq(userItems.guildId, guild.id), eq(userItems.userId, ctx.user.id)));
    if (!owned.length) return ctx.reply({ embeds: [errorEmbed("Your inventory is empty. Use `/shop` and `/buy` to get items.")] });
    const ids = owned.map((r) => r.itemId);
    const allItems = await db.select().from(shopItems)
      .where(and(eq(shopItems.guildId, guild.id), inArray(shopItems.id, ids)));
    const itemMap = new Map(allItems.map((i) => [i.id, i]));
    const lines = owned.map((r) => {
      const item = itemMap.get(r.itemId);
      return item ? `**${item.name}** × ${r.quantity} — *${item.description || "No description"}*` : `Item #${r.itemId} × ${r.quantity}`;
    });
    return ctx.reply({
      embeds: [brandEmbed({
        title: `${ctx.user.tag}'s Inventory`,
        description: lines.join("\n").slice(0, 4000),
        page: "Economy",
      })],
    });
  },
};
