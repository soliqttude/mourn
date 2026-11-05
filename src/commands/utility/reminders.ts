import { EmbedBuilder } from "discord.js";
import { asc, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { remindersTable } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "reminders",
  description: "View your active reminders.",
  category: "utility",
  async execute(ctx) {
    const rows = await db.select().from(remindersTable)
      .where(eq(remindersTable.userId,ctx.user.id))
      .orderBy(asc(remindersTable.remindAt)).limit(25);
    if (!rows.length) return ctx.reply({ content: "You have no active reminders.", ephemeral: true });
    const description = rows.map(r => `**#${r.id}** • <t:${Math.floor(r.remindAt.getTime()/1000)}:R>\n${r.message.slice(0,180)}`).join("\n\n");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Your reminders").setDescription(description).setFooter({text:"Showing up to 25 active reminders."})], ephemeral: true });
  },
};
