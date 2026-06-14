import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { shopItems } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "shopremove",
  description: "Remove an item from the server shop by ID.",
  usage: "shopremove [id]",
  examples: ["shopremove"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "id", description: "Shop item ID (use /shop to see IDs)", type: ApplicationCommandOptionType.Number, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const id = ctx.getNumber("id", true) ?? parseInt(ctx.args[0] ?? "");
    if (!id) return ctx.reply({ embeds: [errorEmbed("Please provide a valid item ID.")] });
    const rows = await db.select().from(shopItems).where(and(eq(shopItems.id, id), eq(shopItems.guildId, guild.id)));
    if (!rows[0]) return ctx.reply({ embeds: [errorEmbed("Item not found in this server's shop.")] });
    await db.delete(shopItems).where(eq(shopItems.id, id));
    return ctx.reply({ embeds: [successEmbed(`Removed **${rows[0].name}** from the shop.`)] });
  },
};
