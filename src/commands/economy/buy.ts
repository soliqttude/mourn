import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy, shopItems, userItems } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { addBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "buy",
  description: "Purchase an item from the shop.",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "id", description: "Item ID from /shop", type: ApplicationCommandOptionType.Number, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const itemId = ctx.getNumber("id", true) ?? parseInt(ctx.args[0] ?? "");
    if (!itemId) return ctx.reply({ embeds: [errorEmbed("Please provide an item ID.")] });
    const itemRows = await db.select().from(shopItems)
      .where(and(eq(shopItems.id, itemId), eq(shopItems.guildId, guild.id)));
    const item = itemRows[0];
    if (!item) return ctx.reply({ embeds: [errorEmbed("Item not found in this server's shop.")] });
    if (item.stock === 0) return ctx.reply({ embeds: [errorEmbed("That item is out of stock.")] });
    const balRows = await db.select({ balance: economy.balance }).from(economy)
      .where(and(eq(economy.guildId, guild.id), eq(economy.userId, ctx.user.id)));
    const balance = balRows[0]?.balance ?? 0;
    if (balance < item.price) return ctx.reply({ embeds: [errorEmbed(`You need **${item.price}** coins but only have **${balance}**.`)] });
    await addBalance(guild.id, ctx.user.id, -item.price);
    await db.insert(userItems).values({ guildId: guild.id, userId: ctx.user.id, itemId, quantity: 1 })
      .onConflictDoUpdate({ target: [userItems.guildId, userItems.userId, userItems.itemId], set: { quantity: 1 } });
    if (item.stock > 0) {
      await db.update(shopItems).set({ stock: item.stock - 1 }).where(eq(shopItems.id, itemId));
    }
    if (item.roleId && ctx.member) {
      const role = guild.roles.cache.get(item.roleId);
      if (role) await ctx.member.roles.add(role).catch(() => null);
    }
    return ctx.reply({ embeds: [successEmbed(`Purchased **${item.name}** for **${item.price}** coins!${item.roleId ? ` You've been given the role.` : ""}`)] });
  },
};
