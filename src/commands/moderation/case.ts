import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { modCases } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "case",
  aliases: ["modcase", "viewcase"],
  description: "Look up a mod case by number.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "number", description: "Case number", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const num = ctx.getNumber("number", true);
    if (!num) return;
    const rows = await db.select().from(modCases).where(and(eq(modCases.id, num), eq(modCases.guildId, ctx.guild.id)));
    const c = rows[0];
    if (!c) return ctx.reply({ embeds: [errorEmbed(`Case #${num} not found.`)] });
    const dur = c.duration ? `\n**Duration:** ${c.duration}` : "";
    return ctx.reply({
      embeds: [brandEmbed({
        title: `Case #${c.id} — ${c.action.toUpperCase()}`,
        description: `**User:** <@${c.userId}>\n**Moderator:** <@${c.moderatorId}>\n**Reason:** ${c.reason}${dur}\n**Date:** <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:F>`,
        page: "Moderation",
      })],
    });
  },
};
