import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levels } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

function xpForLevel(lvl: number): number {
  return Math.floor(100 * Math.pow(1.5, lvl));
}

function calcLevel(xp: number): number {
  let lvl = 0;
  while (xp >= xpForLevel(lvl)) { xp -= xpForLevel(lvl); lvl++; }
  return lvl;
}

export const command: HybridCommand = {
  name: "setxp",
  description: "Set a user's XP to a specific amount (admins only).",
  category: "levels",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to set XP for", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "XP amount", type: ApplicationCommandOptionType.Number, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const xp = ctx.getNumber("amount", true) ?? parseInt(ctx.args[1] ?? "");
    if (!target) return;
    if (!Number.isFinite(xp) || xp < 0) return ctx.reply({ embeds: [errorEmbed("XP must be 0 or higher.")] });
    const newLevel = calcLevel(xp);
    await db.insert(levels).values({ guildId: guild.id, userId: target.id, xp, level: newLevel })
      .onConflictDoUpdate({
        target: [levels.guildId, levels.userId],
        set: { xp, level: newLevel },
      });
    return ctx.reply({ embeds: [successEmbed(`Set **${target.tag}**'s XP to **${xp}** (Level **${newLevel}**).`)] });
  },
};
