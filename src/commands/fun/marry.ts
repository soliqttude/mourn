import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { marriages } from "../../db/schema.js";
import { eq, or, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "marry",
  description: "Propose to someone.",
  category: "fun",
  guildOnly: true,
  aliases: ["propose"],
  options: [{ name: "user", description: "User to propose to", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't marry yourself.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("You can't marry a bot.")] });
    const existing = await db.select().from(marriages).where(
      or(eq(marriages.user1Id, ctx.user.id), eq(marriages.user2Id, ctx.user.id))
    );
    if (existing.length) return ctx.reply({ embeds: [errorEmbed("You're already married. Use `/divorce` first.")] });
    const targetMarried = await db.select().from(marriages).where(
      or(eq(marriages.user1Id, target.id), eq(marriages.user2Id, target.id))
    );
    if (targetMarried.length) return ctx.reply({ embeds: [errorEmbed(`${target.username} is already married.`)] });
    await db.insert(marriages).values({ user1Id: ctx.user.id, user2Id: target.id, guildId: ctx.guild.id });
    return ctx.reply({ embeds: [brandEmbed({ title: "💍 Married!", description: `${ctx.user.username} and ${target.username} are now married! 🎉`, page: "Fun" })] });
  },
};
