import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getRep } from "../../features/reputation.js";
import { db } from "../../db/index.js";
import { levels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";

interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  check: (data: { level: number; rep: number }) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "level5", emoji: "⭐", name: "rising star", desc: "reach level 5", check: d => d.level >= 5 },
  { id: "level10", emoji: "🌟", name: "veteran", desc: "reach level 10", check: d => d.level >= 10 },
  { id: "level25", emoji: "👑", name: "elite", desc: "reach level 25", check: d => d.level >= 25 },
  { id: "rep10", emoji: "👏", name: "liked", desc: "earn 10 rep", check: d => d.rep >= 10 },
  { id: "rep50", emoji: "🤝", name: "beloved", desc: "earn 50 rep", check: d => d.rep >= 50 },
];

export const command: HybridCommand = {
  name: "achievements",
  description: "See your earned achievements.",
  usage: "achievements [user]",
  examples: ["achievements"],
  category: "fun",
  guildOnly: true,
  aliases: ["badges"],
  options: [
    { name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = (await ctx.getUser("user")) ?? ctx.user;

    const [rep, levelRow] = await Promise.all([
      getRep(ctx.guild.id, target.id),
      db.select().from(levels).where(and(eq(levels.guildId, ctx.guild.id), eq(levels.userId, target.id))).then(r => r[0]),
    ]);

    const data = { level: levelRow?.level ?? 0, rep: rep.repCount };
    const earned = ACHIEVEMENTS.filter(a => a.check(data));
    const locked = ACHIEVEMENTS.filter(a => !a.check(data));

    const earnedStr = earned.length
      ? earned.map(a => `${a.emoji} **${a.name}** — ${a.desc}`).join("\n")
      : "none yet.";
    const lockedStr = locked.length
      ? locked.map(a => `🔒 ~~${a.name}~~ — ${a.desc}`).join("\n")
      : "all unlocked!";

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setAuthor({ name: `${target.username}'s achievements`, iconURL: target.displayAvatarURL() })
          .addFields(
            { name: `✅ earned (${earned.length}/${ACHIEVEMENTS.length})`, value: earnedStr.slice(0, 1000) },
            { name: "🔒 locked", value: lockedStr.slice(0, 1000) },
          )
          .setFooter({ text: `${config.embedFooter} • achievements` })
          .setTimestamp(),
      ],
    });
  },
};
