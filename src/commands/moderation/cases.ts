import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { modCases } from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export const command: HybridCommand = {
  name: "cases",
  description: "View all mod cases for a user.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to look up", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const rows = await db.select().from(modCases)
      .where(and(eq(modCases.guildId, ctx.guild.id), eq(modCases.userId, target.id)))
      .orderBy(desc(modCases.createdAt))
      .limit(15);
    if (rows.length === 0) return ctx.reply({ embeds: [brandEmbed({ title: `Cases for ${target.tag}`, description: "No cases found.", page: "Moderation" })] });
    const desc2 = rows.map((c) => `**#${c.id}** ${c.action.toUpperCase()} — ${c.reason}${c.duration ? ` (${c.duration})` : ""} — <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:d>`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: `Cases for ${target.tag} (${rows.length})`, description: desc2, page: "Moderation" })] });
  },
};
