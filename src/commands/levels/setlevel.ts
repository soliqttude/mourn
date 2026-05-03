import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levels } from "../../db/schema.js";
import { totalXpForLevel } from "../../features/leveling.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "setlevel",
  description: "Set a user's level directly (admins only).",
  category: "levels",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to set level for", type: ApplicationCommandOptionType.User, required: true },
    { name: "level", description: "Level to set", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    const level = ctx.getNumber("level", true) ?? parseInt(ctx.args[1]);
    if (!target) return;
    if (!Number.isFinite(level) || level < 0) return ctx.reply({ embeds: [errorEmbed("Level must be 0 or higher.")] });
    const xp = totalXpForLevel(level);
    await db.insert(levels).values({ guildId: ctx.guild.id, userId: target.id, xp, level })
      .onConflictDoUpdate({ target: [levels.guildId, levels.userId], set: { xp, level } });
    return ctx.reply({ embeds: [successEmbed(`Set **${target.tag}**'s level to **${level}** (${xp} XP).`)] });
  },
};
