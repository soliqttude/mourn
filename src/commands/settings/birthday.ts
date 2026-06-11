import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { birthdays } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "birthday",
  description: "Manage birthdays.",
  usage: "birthday",
  examples: ["birthday"],
  category: "settings",
  guildOnly: true,
  options: [
    {
      name: "set", description: "Set your birthday", type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: "month", description: "Month (1-12)", type: ApplicationCommandOptionType.Integer, required: true },
        { name: "day", description: "Day (1-31)", type: ApplicationCommandOptionType.Integer, required: true },
      ],
    },
    { name: "remove", description: "Remove your birthday", type: ApplicationCommandOptionType.Subcommand },
    {
      name: "list", description: "List server birthdays", type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "channel", description: "Set the birthday announcement channel (admin)", type: ApplicationCommandOptionType.Subcommand,
      options: [{ name: "channel", description: "Channel", type: ApplicationCommandOptionType.Channel, required: true }],
    },
  ] as any,
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = ctx.getString("subcommand") ?? (ctx.source === "prefix" ? ctx.args[0] : null);
    const interaction = ctx.raw as any;
    const subName = ctx.source === "slash" ? interaction.options?.getSubcommand?.() : ctx.args[0];

    if (subName === "set") {
      const month = ctx.source === "slash" ? interaction.options.getInteger("month") : parseInt(ctx.args[1]);
      const day = ctx.source === "slash" ? interaction.options.getInteger("day") : parseInt(ctx.args[2]);
      if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return ctx.reply({ embeds: [errorEmbed("Invalid date.")] });
      await db.insert(birthdays).values({ userId: ctx.user.id, guildId: ctx.guild.id, month, day })
        .onConflictDoUpdate({ target: [birthdays.userId, birthdays.guildId], set: { month, day } });
      return ctx.reply({ embeds: [successEmbed(`Your birthday is set to **${month}/${day}**. 🎂`)] });
    }

    if (subName === "remove") {
      await db.delete(birthdays).where(and(eq(birthdays.userId, ctx.user.id), eq(birthdays.guildId, ctx.guild.id)));
      return ctx.reply({ embeds: [successEmbed("Your birthday has been removed.")] });
    }

    if (subName === "list") {
      const rows = await db.select().from(birthdays).where(eq(birthdays.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [brandEmbed({ title: "Birthdays", description: "No birthdays set.", page: "Settings" })] });
      const sorted = rows.sort((a, b) => a.month - b.month || a.day - b.day);
      const list = sorted.slice(0, 25).map(r => `<@${r.userId}> — **${r.month}/${r.day}**`).join("\n");
      return ctx.reply({ embeds: [brandEmbed({ title: `🎂 Birthdays (${rows.length})`, description: list, page: "Settings" })] });
    }

    if (subName === "channel") {
      const ch = ctx.getChannel("channel");
      if (!ch) return ctx.reply({ embeds: [errorEmbed("**Channel** not found.")] });
      const { updateGuildSettings } = await import("../../db/settings.js");
      await updateGuildSettings(ctx.guild.id, { birthdayChannel: ch.id } as any);
      return ctx.reply({ embeds: [successEmbed(`Birthday announcements will go to <#${ch.id}>.`)] });
    }

    return ctx.reply({ embeds: [brandEmbed({ description: "Use `/birthday set`, `/birthday remove`, `/birthday list`, or `/birthday channel`.", page: "Settings" })] });
  },
};
