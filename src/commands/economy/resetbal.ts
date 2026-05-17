import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "resetbal",
  aliases: ["resetbalance", "resetmoney"],
  description: "Reset a user's balance to 0 (admin).",
  category: "economy",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "user", description: "User to reset", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("User not found.")] });
    await db.update(economy).set({ balance: 0, bank: 0 }).where(and(eq(economy.guildId, ctx.guild.id), eq(economy.userId, target.id)));
    return ctx.reply({ embeds: [successEmbed(`Reset **${target.tag}**'s balance.`)] });
  },
};
