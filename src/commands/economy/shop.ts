import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { shopItems } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "shop",
  aliases: ["store", "market"],
  description: "View the server item shop.",
  category: "economy",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const items = await db.select().from(shopItems).where(eq(shopItems.guildId, guild.id));
    if (!items.length) return ctx.reply({ embeds: [errorEmbed("The shop is empty. Admins can add items with `/shopadd`.")] });
    const desc = items.map((item) => {
      const stock = item.stock === -1 ? "∞" : `${item.stock}`;
      const role = item.roleId ? ` → <@&${item.roleId}>` : "";
      return `**#${item.id} ${item.name}** — **${item.price}** coins (stock: ${stock})${role}\n${item.description ? `  *${item.description}*` : ""}`;
    }).join("\n");
    return ctx.reply({
      embeds: [brandEmbed({
        title: `${guild.name} Shop`,
        description: desc.slice(0, 4000),
        page: "Economy",
      })],
    });
  },
};
