import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { inviteUses } from "../../db/schema.js";
import { eq, sql } from "drizzle-orm";

export const command: HybridCommand = {
  name: "topinvites",
  description: "Show the top inviters in the server.",
  category: "utility",
  guildOnly: true,
  aliases: ["invitetop", "inviteleaderboard"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await db
      .select({ inviterId: inviteUses.inviterId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(inviteUses)
      .where(eq(inviteUses.guildId, ctx.guild.id))
      .groupBy(inviteUses.inviterId)
      .orderBy(sql`count(*) desc`)
      .limit(10);
    if (!rows.length) return ctx.reply({ embeds: [brandEmbed({ title: "Top Inviters", description: "No invite data yet.", page: "Utility" })] });
    const list = rows.map((r, i) => `**${i + 1}.** <@${r.inviterId}> — **${r.count}** invites`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: "🏆 Top Inviters", description: list, page: "Utility" })] });
  },
};
