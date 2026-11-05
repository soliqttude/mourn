import { ApplicationCommandOptionType } from "discord.js";
import { eq, and } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { remindersTable } from "../../db/schema.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "remindremove",
  aliases: ["removereminder", "remind-delete"],
  description: "Remove one of your reminders by ID.",
  category: "utility",
  options: [{ name: "id", description: "Reminder ID", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    const id = ctx.getNumber("id") ?? Number(ctx.args[0]);
    if (!Number.isSafeInteger(id) || id <= 0) return ctx.reply({ embeds: [errorEmbed("Provide a valid reminder ID.")], ephemeral: true });
    try {
      const deleted = await db.delete(remindersTable)
        .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, ctx.user.id)))
        .returning({ id: remindersTable.id });
      if (!deleted.length) return ctx.reply({ embeds: [errorEmbed("That reminder does not exist or does not belong to you.")], ephemeral: true });
      return ctx.reply({ embeds: [successEmbed(`Removed reminder **#${id}**.`)], ephemeral: true });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not remove reminder.")], ephemeral: true });
    }
  },
};
