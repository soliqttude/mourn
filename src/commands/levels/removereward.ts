import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levelRewards } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "removereward",
  description: "Remove a level role reward.",
  category: "levels",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "level", description: "Level to remove reward from", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const level = ctx.getNumber("level", true) ?? parseInt(ctx.args[0]);
    if (!level) return;
    const rows = await db.select().from(levelRewards).where(and(eq(levelRewards.guildId, ctx.guild.id), eq(levelRewards.level, level)));
    if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`No reward set for Level ${level}.`)] });
    await db.delete(levelRewards).where(and(eq(levelRewards.guildId, ctx.guild.id), eq(levelRewards.level, level)));
    return ctx.reply({ embeds: [successEmbed(`Removed the reward for Level **${level}**.`)] });
  },
};
