import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { shopItems } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "shopadd",
  description: "Add an item to the server shop.",
  usage: "shopadd [name] [price] [description] [role] [stock]",
  examples: ["shopadd"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "name", description: "Item name", type: ApplicationCommandOptionType.String, required: true },
    { name: "price", description: "Price in coins", type: ApplicationCommandOptionType.Number, required: true },
    { name: "description", description: "Item description", type: ApplicationCommandOptionType.String, required: false },
    { name: "role", description: "Role to grant on purchase", type: ApplicationCommandOptionType.Role, required: false },
    { name: "stock", description: "Stock (-1 = unlimited)", type: ApplicationCommandOptionType.Number, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const name = ctx.getString("name", true) ?? ctx.args[0];
    const price = ctx.getNumber("price", true) ?? 100;
    const description = ctx.getString("description") ?? "";
    const role = ctx.getRole("role");
    const stock = ctx.getNumber("stock") ?? -1;
    if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide an item name.")] });
    if (price < 1) return ctx.reply({ embeds: [errorEmbed("Price must be at least 1 coin.")] });
    await db.insert(shopItems).values({
      guildId: guild.id, name, description, price, roleId: role?.id ?? null, stock,
    });
    return ctx.reply({ embeds: [successEmbed(`Added **${name}** to the shop for **${price}** coins.`)] });
  },
};
