import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { modCases } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "deletecase",
  description: "Delete a mod case.",
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  aliases: ["delcase"],
  options: [{ name: "case", description: "Case ID", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const caseId = ctx.getNumber("case", true) ?? parseInt(ctx.args[0]);
    if (!caseId) return;
    const rows = await db.select().from(modCases).where(and(eq(modCases.id, caseId), eq(modCases.guildId, ctx.guild.id)));
    if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`Case #${caseId} not found.`)] });
    await db.delete(modCases).where(eq(modCases.id, caseId));
    return ctx.reply({ embeds: [successEmbed(`Deleted Case #${caseId}.`)] });
  },
};
