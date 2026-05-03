import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy, shopItems, userItems } from "../../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { addBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "buy",
  aliases: ["purchase"],
  description: "Buy an item from the shop by name or ID.",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "item", description: "Item name or ID (see ,shop)", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const input = (ctx.getString("item") ?? ctx.args.join(" ")).trim();
    if (!input) return ctx.reply({ embeds: [errorEmbed("Provide an item name or ID — use `,shop` to see available items.")] });

    const allItems = await db.select().from(shopItems).where(eq(shopItems.guildId, guild.id));
    const numId = parseInt(input);
    const item = isNaN(numId)
      ? (allItems.find(i => i.name.toLowerCase() === input.toLowerCase())
         ?? allItems.find(i => i.name.toLowerCase().includes(input.toLowerCase())))
      : allItems.find(i => i.id === numId);

    if (!item) return ctx.reply({ embeds: [errorEmbed(`No item named **${input}** found. Use \`,shop\` to browse available items.`)] });
    if (item.stock === 0) return ctx.reply({ embeds: [errorEmbed(`**${item.name}** is out of stock.`)] });

    const balRows = await db.select({ balance: economy.balance }).from(economy)
      .where(and(eq(economy.guildId, guild.id), eq(economy.userId, ctx.user.id)));
    const balance = balRows[0]?.balance ?? 0;
    if (balance < item.price) {
      return ctx.reply({ embeds: [errorEmbed(`You need **${item.price}** coins but only have **${balance}**.`)] });
    }

    await addBalance(guild.id, ctx.user.id, -item.price);
    await db.insert(userItems).values({ guildId: guild.id, userId: ctx.user.id, itemId: item.id, quantity: 1 })
      .onConflictDoUpdate({
        target: [userItems.guildId, userItems.userId, userItems.itemId],
        set: { quantity: sql`${userItems.quantity} + 1` },
      });
    if (item.stock > 0) {
      await db.update(shopItems).set({ stock: item.stock - 1 }).where(eq(shopItems.id, item.id));
    }
    if (item.roleId && ctx.member) {
      const role = guild.roles.cache.get(item.roleId);
      if (role) await ctx.member.roles.add(role).catch(() => null);
    }
    return ctx.reply({
      embeds: [successEmbed(`Purchased **${item.name}** for **${item.price}** coins!${item.roleId ? " You received the role!" : ""}`)],
    });
  },
};
