import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getLevel, levelFromXp, xpForLevel } from "../../features/leveling.js";

export const command: HybridCommand = {
  name: "rank",
  aliases: ["level", "lvl"],
  description: "Check your or another user's level.",
  category: "levels",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const data = await getLevel(ctx.guild.id, target.id);
    const xp = data?.xp ?? 0;
    const level = levelFromXp(xp);
    const need = xpForLevel(level);
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `${target.username} — Level ${level}`,
          description: `XP: **${xp.toLocaleString()}**\nNext level needs ~${need} more.`,
          thumbnail: target.displayAvatarURL({ size: 256 }),
          page: "Levels",
        }),
      ],
    });
  },
};
