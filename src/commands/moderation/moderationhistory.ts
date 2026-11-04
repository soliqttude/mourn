import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { and, desc, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "moderationhistory",
  aliases: ["modhistory"],
  description: "Show a member's moderation warning history.",
  category: "moderation",
  guildOnly: true,
  userPermissions: ["ManageMessages"],
  options: [{ name: "member", description: "Member to inspect", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const member = await ctx.getUser("member", true);
    if (!member) return;
    const rows = await db.select().from(warnings)
      .where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.userId, member.id)))
      .orderBy(desc(warnings.createdAt)).limit(25);
    if (!rows.length) return ctx.reply({ content: `No recorded warning cases for <@${member.id}>.`, allowedMentions: { parse: [] } });
    const lines = rows.map(row => `#${row.id} · ${row.reason} · <t:${Math.floor(row.createdAt.getTime()/1000)}:R> · moderator <@${row.moderatorId}>`);
    return ctx.reply({
      embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle(`Moderation history · ${member.tag}`).setDescription(lines.join("\n").slice(0, 4000))],
      allowedMentions: { parse: [] },
    });
  },
};
