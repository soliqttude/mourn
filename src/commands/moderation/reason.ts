import { ApplicationCommandOptionType } from "discord.js";
import { and, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "reason",
  description: "Update the reason attached to a warning case.",
  category: "moderation",
  guildOnly: true,
  userPermissions: ["ManageMessages"],
  options: [
    { name: "case", description: "Warning case ID", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "reason", description: "Replacement reason", type: ApplicationCommandOptionType.String, required: true, max_length: 500 },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const id = ctx.getNumber("case", true);
    const reason = ctx.getString("reason", true)?.trim();
    if (!id || id < 1 || !reason) return ctx.reply({ content: "Provide a valid case ID and reason.", ephemeral: true });
    const rows = await db.update(warnings).set({ reason }).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.id, id))).returning({ id: warnings.id });
    if (!rows.length) return ctx.reply({ content: `Warning case #${id} was not found.`, ephemeral: true });
    return ctx.reply({ content: `Updated the reason for warning case #${id}.`, allowedMentions: { parse: [] } });
  },
};
