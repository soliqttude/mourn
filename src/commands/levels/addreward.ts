import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { levelRewards } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "addreward",
  description: "Add a role reward for reaching a level.",
  usage: "addreward [level] [role]",
  examples: ["addreward"],
  category: "levels",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "level", description: "Level required", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "role", description: "Role to give", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const level = ctx.getNumber("level", true) ?? parseInt(ctx.args[0]);
    const role = ctx.getRole("role");
    if (!level || !role) return ctx.reply({ embeds: [errorEmbed("Invalid input.")] });
    await db.insert(levelRewards).values({ guildId: ctx.guild.id, level, roleId: role.id }).onConflictDoUpdate({ target: [levelRewards.guildId, levelRewards.level], set: { roleId: role.id } });
    return ctx.reply({ embeds: [successEmbed(`Set **${role.name}** as the reward for reaching Level **${level}**.`)] });
  },
};
