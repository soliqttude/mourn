import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levels } from "../../db/schema.js";
import { levelFromXp } from "../../features/leveling.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "removexp",
  description: "Remove XP from a user.",
  category: "levels",
  permission: "admin",
  guildOnly: true,
  aliases: ["takexp"],
  options: [
    { name: "user", description: "Member", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "XP to remove", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    const amount = ctx.getNumber("amount", true) ?? parseInt(ctx.args[1]);
    if (!target || !amount || amount <= 0) return ctx.reply({ embeds: [errorEmbed("Invalid input.")] });
    const existing = await db.select().from(levels).where(and(eq(levels.guildId, ctx.guild.id), eq(levels.userId, target.id)));
    const newXp = Math.max(0, (existing[0]?.xp ?? 0) - amount);
    const newLevel = levelFromXp(newXp);
    await db.insert(levels).values({ guildId: ctx.guild.id, userId: target.id, xp: newXp, level: newLevel })
      .onConflictDoUpdate({ target: [levels.guildId, levels.userId], set: { xp: newXp, level: newLevel } });
    return ctx.reply({ embeds: [successEmbed(`Removed **${amount}** XP from **${target.tag}**. Now at ${newXp} XP (Level ${newLevel}).`)] });
  },
};
