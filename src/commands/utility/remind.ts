import { ApplicationCommandOptionType, ApplicationCommandOptionData, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed, brandEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { addReminder } from "../../features/reminders.js";
import { db } from "../../db/index.js";
import { remindersTable } from "../../db/schema.js";
import { and, asc, eq } from "drizzle-orm";

const options: ApplicationCommandOptionData[] = [
  {
    name: "set",
    description: "Create a reminder",
    type: ApplicationCommandOptionType.Subcommand,
    options: [
      { name: "duration", description: "When to remind you (e.g. 10m, 2h, 1d)", type: ApplicationCommandOptionType.String, required: true },
      { name: "reminder", description: "What should I remind you about?", type: ApplicationCommandOptionType.String, required: true },
    ],
  },
  {
    name: "list",
    description: "View your pending reminders",
    type: ApplicationCommandOptionType.Subcommand,
  },
  {
    name: "remove",
    description: "Remove one of your reminders",
    type: ApplicationCommandOptionType.Subcommand,
    options: [{ name: "id", description: "Reminder ID", type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }],
  },
];

export const command: HybridCommand = {
  name: "remind",
  aliases: ["reminder", "remindme"],
  description: "Create, list, or remove your reminders.",
  category: "moderation",
  options,
  async execute(ctx) {
    const subcommand = ctx.getSubcommand(false) ?? (ctx.source === "prefix" ? ctx.args[0]?.toLowerCase() : null) ?? "set";
    const offset = ctx.source === "prefix" && ["set", "list", "remove"].includes(subcommand) ? 1 : 0;

    if (subcommand === "list") {
      const rows = await db.select().from(remindersTable)
        .where(eq(remindersTable.userId, ctx.user.id))
        .orderBy(asc(remindersTable.remindAt))
        .limit(25);
      if (!rows.length) return ctx.reply({ embeds: [brandEmbed({ title: "Your reminders", description: "You have no pending reminders.", page: "Reminders" })] });
      const description = rows.map((row) =>
        `**#${row.id}** — <t:${Math.floor(row.remindAt.getTime() / 1000)}:R>\n${row.message.slice(0, 250)}`
      ).join("\n\n");
      return ctx.reply({ embeds: [brandEmbed({ title: "Your reminders", description, page: "Reminders" })] });
    }

    if (subcommand === "remove") {
      const id = ctx.getNumber("id") ?? Number(ctx.args[offset + 1]);
      if (!Number.isSafeInteger(id) || id < 1) return ctx.reply({ embeds: [errorEmbed("Provide a valid reminder ID.")] });
      const rows = await db.delete(remindersTable)
        .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, ctx.user.id)))
        .returning({ id: remindersTable.id });
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("That reminder was not found, or it belongs to another user.")] });
      return ctx.reply({ embeds: [successEmbed(`Removed reminder **#${id}**.`)] });
    }

    if (subcommand !== "set") return ctx.reply({ embeds: [errorEmbed("Use `remind`, `remind list`, or `remind remove <id>`.")] });
    const duration = ctx.getString("duration") ?? ctx.args[offset] ?? null;
    const message = ctx.getString("reminder") ?? ctx.args.slice(offset + 1).join(" ").trim();
    if (!duration || !message) return ctx.reply({ embeds: [errorEmbed("Usage: `,remind <duration> <reminder>`.")] });
    const ms = parseDuration(duration);
    if (!ms || ms < 60_000 || ms > 365 * 24 * 60 * 60 * 1000) {
      return ctx.reply({ embeds: [errorEmbed("Use a valid duration from 1 minute up to 365 days (for example, `30m`, `2h`, or `1d`).")] });
    }
    const channelId = ctx.channel?.id;
    if (!channelId) return ctx.reply({ embeds: [errorEmbed("Reminders must be set in a server or direct-message channel.")] });
    const remindAt = new Date(Date.now() + ms);
    try {
      await addReminder(ctx.user.id, channelId, ctx.guild?.id ?? null, message, remindAt);
      return ctx.reply({ embeds: [successEmbed(`Reminder set for <t:${Math.floor(remindAt.getTime() / 1000)}:R>.\n**Reminder:** ${message}`)] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not save your reminder.")] });
    }
  },
};
