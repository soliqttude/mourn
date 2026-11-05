import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { and, count, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";
import { errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "modstats", description: "View warning statistics for a moderator.", category: "moderation", permission: "manage_messages", guildOnly: true,
  options: [{ name: "member", description: "Moderator to inspect", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const member = await ctx.getUser("member", true);
    if (!member) return ctx.reply({ embeds: [errorEmbed("Provide a valid moderator.")] });
    const [result] = await db.select({ total: count() }).from(warnings).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.moderatorId, member.id)));
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Moderator statistics").setDescription("**Moderator:** <@" + member.id + ">\n**Warnings issued:** " + (result?.total ?? 0))] });
  },
};