import { ApplicationCommandOptionType } from "discord.js";
import { and, eq, desc } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "warnings",
  aliases: ["warns"],
  description: "View warnings for a member.",
  usage: "warnings [user]",
  examples: ["warnings"],
  category: "moderation",
  permission: "kick_members",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target || !ctx.guild) return;
    const rows: Array<{ id: number; reason: string; createdAt: Date }> = await db
      .select()
      .from(warnings)
      .where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.userId, target.id)))
      .orderBy(desc(warnings.createdAt))
      .limit(15);
    if (rows.length === 0) {
      return ctx.reply({ embeds: [errorEmbed(`${target.tag} has no warnings.`)] });
    }
    const lines = rows
      .map(
        (r, i) =>
          `**${i + 1}.** \`${r.id}\` — ${r.reason} • <t:${Math.floor(r.createdAt.getTime() / 1000)}:R>`
      )
      .join("\n");
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `Warnings — ${target.tag}`,
          description: lines,
          page: "Moderation",
        }),
      ],
    });
  },
};
