import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { userItems, shopItems } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { addBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "sell",
  description: "Sell an item from your inventory for 50% of its price.",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "id", description: "Item ID to sell", type: ApplicationCommandOptionType.Number, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const itemId = ctx.getNumber("id", true) ?? parseInt(ctx.args[0] ?? "");
    if (!itemId) return ctx.reply({ embeds: [errorEmbed("Please provide an item ID.")] });
    const owned = await db.select().from(userItems)
      .where(and(eq(userItems.guildId, guild.id), eq(userItems.userId, ctx.user.id), eq(userItems.itemId, itemId)));
    if (!owned[0]) return ctx.reply({ embeds: [errorEmbed("You don't own that item.")] });
    const itemRows = await db.select().from(shopItems)
      .where(and(eq(shopItems.id, itemId), eq(shopItems.guildId, guild.id)));
    const item = itemRows[0];
    if (!item) return ctx.reply({ embeds: [errorEmbed("Item not found.")] });
    const sellPrice = Math.floor(item.price / 2);
    await db.delete(userItems).where(and(eq(userItems.guildId, guild.id), eq(userItems.userId, ctx.user.id), eq(userItems.itemId, itemId)));
    await addBalance(guild.id, ctx.user.id, sellPrice);
    return ctx.reply({ embeds: [successEmbed(`Sold **${item.name}** for **${sellPrice}** coins.`)] });
  },
};
