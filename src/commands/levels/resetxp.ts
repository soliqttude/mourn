import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levels } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "resetxp",
  description: "Reset a user's XP to zero.",
  usage: "resetxp [user]",
  examples: ["resetxp"],
  category: "levels",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "user", description: "Member to reset", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("User not found.")] });
    await db.update(levels).set({ xp: 0, level: 0 }).where(and(eq(levels.guildId, ctx.guild.id), eq(levels.userId, target.id)));
    return ctx.reply({ embeds: [successEmbed(`Reset **${target.tag}**'s XP.`)] });
  },
};
