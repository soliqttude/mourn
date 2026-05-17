import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { modCases } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "reason",
  aliases: ["editreason", "updatereason"],
  description: "Edit the reason for a mod case.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "case", description: "Case ID", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "reason", description: "New reason", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const caseId = ctx.getNumber("case", true) ?? parseInt(ctx.args[0]);
    const reason = ctx.getString("reason", true) ?? ctx.args.slice(1).join(" ");
    if (!caseId || !reason) return;
    const rows = await db.select().from(modCases).where(and(eq(modCases.id, caseId), eq(modCases.guildId, ctx.guild.id)));
    if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`Case #${caseId} not found.`)] });
    await db.update(modCases).set({ reason }).where(eq(modCases.id, caseId));
    return ctx.reply({ embeds: [successEmbed(`Updated reason for Case #${caseId}: ${reason}`)] });
  },
};
