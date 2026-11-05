import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { and, asc, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { remindersTable } from "../../db/schema.js";
import { addReminder } from "../../features/reminders.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "remind",
  aliases: ["reminder", "remindme"],
  description: "Create, list, or remove your reminders.",
  category: "utility",
  options: [
    { type: ApplicationCommandOptionType.Subcommand, name: "set", description: "Create a reminder", options: [
      { name: "duration", description: "When to remind you (e.g. 10m, 2h, 1d)", type: ApplicationCommandOptionType.String, required: true },
      { name: "reminder", description: "What should I remind you about?", type: ApplicationCommandOptionType.String, required: true },
    ]},
    { type: ApplicationCommandOptionType.Subcommand, name: "list", description: "View your active reminders" },
    { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Remove one of your reminders", options: [
      { name: "id", description: "Reminder ID", type: ApplicationCommandOptionType.Integer, required: true },
    ]},
  ],
  async execute(ctx) {
    const action = (ctx.getSubcommand() ?? ctx.args[0] ?? "set").toLowerCase();
    if (action === "list") {
      const rows = await db.select().from(remindersTable)
        .where(eq(remindersTable.userId, ctx.user.id))
        .orderBy(asc(remindersTable.remindAt)).limit(25);
      if (!rows.length) return ctx.reply({ content: "You have no active reminders.", ephemeral: true });
      const description = rows.map(r => `**#${r.id}** • <t:${Math.floor(r.remindAt.getTime()/1000)}:R>\n${r.message.slice(0,180)}`).join("\n\n");
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Your reminders").setDescription(description).setFooter({ text: "Showing up to 25 active reminders." })], ephemeral: true });
    }
    if (action === "remove") {
      const id = ctx.getNumber("id") ?? Number(ctx.args[1]);
      if (!Number.isSafeInteger(id) || id <= 0) return ctx.reply({ embeds: [errorEmbed("Provide a valid reminder ID.")], ephemeral: true });
      const deleted = await db.delete(remindersTable).where(and(eq(remindersTable.id,id),eq(remindersTable.userId,ctx.user.id))).returning({id:remindersTable.id});
      if (!deleted.length) return ctx.reply({ embeds: [errorEmbed("That reminder does not exist or does not belong to you.")], ephemeral: true });
      return ctx.reply({ embeds: [successEmbed(`Removed reminder **#${id}**.`)], ephemeral: true });
    }
    if (action !== "set") return ctx.reply({ embeds: [errorEmbed("Use `,remind <duration> <reminder>`, `,remind list`, or `,remind remove <id>`.")] });
    const duration = ctx.getString("duration") ?? ctx.args[0];
    const message = ctx.getString("reminder") ?? ctx.args.slice(1).join(" ").trim();
    if (!duration || !message) return ctx.reply({ embeds: [errorEmbed("Usage: `,remind <duration> <reminder>`.")] });
    const ms = parseDuration(duration);
    if (!ms || ms < 60_000 || ms > 365 * 24 * 60 * 60 * 1000) return ctx.reply({ embeds: [errorEmbed("Use a duration from 1 minute up to 365 days (e.g. `30m`, `2h`, or `1d`).")] });
    const channelId = ctx.channel?.id;
    if (!channelId) return ctx.reply({ embeds: [errorEmbed("Could not determine a channel for this reminder.")] });
    const remindAt = new Date(Date.now()+ms);
    try {
      await addReminder(ctx.user.id,channelId,ctx.guild?.id ?? null,message,remindAt);
      return ctx.reply({ embeds: [successEmbed(`Reminder set for <t:${Math.floor(remindAt.getTime()/1000)}:R>.\n**Reminder:** ${message}`)] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not save your reminder.")] });
    }
  },
};
