import { EmbedBuilder } from "discord.js";
import { eq, and, asc } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { remindersTable } from "../../db/schema.js";
import { errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "remindlist",
  aliases: ["reminders", "remind-list"],
  description: "View your active reminders.",
  category: "utility",
  async execute(ctx) {
    try {
      const rows = await db.select().from(remindersTable)
        .where(eq(remindersTable.userId, ctx.user.id))
        .orderBy(asc(remindersTable.remindAt)).limit(25);
      if (!rows.length) return ctx.reply({ content: "You have no active reminders.", ephemeral: true });
      const description = rows.map((r) =>
        `**#${r.id}** • <t:${Math.floor(r.remindAt.getTime() / 1000)}:R>\n${r.message.slice(0, 180)}`
      ).join("\n\n");
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Your reminders").setDescription(description).setFooter({ text: "Showing up to 25 active reminders." })], ephemeral: true });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not load reminders.")], ephemeral: true });
    }
  },
};
