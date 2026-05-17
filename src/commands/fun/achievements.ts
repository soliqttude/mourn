import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getEconomy, getRep } from "../../features/economy.js";
import { db } from "../../db/index.js";
import { levels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";

interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  check: (data: { balance: number; level: number; streak: number; rep: number; prestige: number }) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first_coins",    emoji: "🪙", name: "first steps",       desc: "have any coins",                         check: d => d.balance > 0 },
  { id: "rich",          emoji: "💰", name: "comfortable",        desc: "reach 10,000 coins",                     check: d => d.balance >= 10_000 },
  { id: "wealthy",       emoji: "💎", name: "wealthy",            desc: "reach 100,000 coins",                    check: d => d.balance >= 100_000 },
  { id: "millionaire",   emoji: "🏦", name: "millionaire",        desc: "reach 1,000,000 coins",                  check: d => d.balance >= 1_000_000 },
  { id: "level5",        emoji: "⭐", name: "rising star",        desc: "reach level 5",                          check: d => d.level >= 5 },
  { id: "level10",       emoji: "🌟", name: "veteran",            desc: "reach level 10",                         check: d => d.level >= 10 },
  { id: "level25",       emoji: "👑", name: "elite",              desc: "reach level 25",                         check: d => d.level >= 25 },
  { id: "streak7",       emoji: "🔥", name: "dedicated",          desc: "7-day daily streak",                     check: d => d.streak >= 7 },
  { id: "streak30",      emoji: "🌊", name: "unstoppable",        desc: "30-day daily streak",                    check: d => d.streak >= 30 },
  { id: "rep10",         emoji: "👏", name: "liked",              desc: "earn 10 rep",                            check: d => d.rep >= 10 },
  { id: "rep50",         emoji: "🤝", name: "beloved",            desc: "earn 50 rep",                            check: d => d.rep >= 50 },
  { id: "prestige1",     emoji: "♾️", name: "ascended",           desc: "reach prestige 1",                       check: d => d.prestige >= 1 },
];

export const command: HybridCommand = {
  name: "achievements",
  description: "See your earned achievements.",
  usage: "first steps [user]",
  examples: ["first steps"],
  category: "fun",
  guildOnly: true,
  aliases: ["badges"],
  options: [
    { name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = (await ctx.getUser("user")) ?? ctx.user;

    const [eco, rep, levelRow] = await Promise.all([
      getEconomy(ctx.guild.id, target.id),
      getRep(ctx.guild.id, target.id),
      db.select().from(levels).where(and(eq(levels.guildId, ctx.guild.id), eq(levels.userId, target.id))).then(r => r[0]),
    ]);

    const data = {
      balance: eco.balance,
      level: levelRow?.level ?? 0,
      streak: eco.streak,
      rep: rep.repCount,
      prestige: eco.prestige,
    };

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
