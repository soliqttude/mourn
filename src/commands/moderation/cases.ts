import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { modCases } from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { paginate, chunkArray } from "../../lib/paginator.js";

export const command: HybridCommand = {
  name: "cases",
  aliases: ["modcases", "allcases"],
  description: "View all mod cases for a user.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  usage: "<@user>",
  options: [
    { name: "user", description: "User to look up", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const target = await ctx.getUser("user", true).catch(() => null);
    if (!target) {
      return ctx.reply({ embeds: [errorEmbed("User not found. Usage: `,cases @user` or `/cases user:@user`")] });
    }

    const rows = await db
      .select()
      .from(modCases)
      .where(and(eq(modCases.guildId, guild.id), eq(modCases.userId, target.id)))
      .orderBy(desc(modCases.createdAt))
      .limit(500);

    if (rows.length === 0) {
      return ctx.reply({
        embeds: [brandEmbed({ title: `Cases for ${target.username}`, description: "No cases found for this user.", page: "Moderation" })],
      });
    }

    const lines = rows.map(
      (c) =>
        `**#${c.id}** \`${c.action.toUpperCase()}\` — ${c.reason}${c.duration ? ` *(${c.duration})*` : ""} — <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:d>`
    );

    const pages = chunkArray(lines, 10).map((chunk) =>
      brandEmbed({
        title: `Cases for ${target.username} (${rows.length})`,
        description: chunk.join("\n"),
      })
    );

    return paginate(ctx, pages, { label: "Moderation" });
  },
};
