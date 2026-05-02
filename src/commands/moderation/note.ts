import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { modNotes } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "note",
  description: "Manage moderator notes on users.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "add", description: "Add a note to a user", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true }, { name: "note", description: "Note content", type: ApplicationCommandOptionType.String, required: true }] } as any,
    { name: "list", description: "View all notes on a user", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true }] } as any,
    { name: "delete", description: "Delete a note by ID", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "id", description: "Note ID", type: ApplicationCommandOptionType.Integer, required: true }] } as any,
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = ctx.getString("subcommand") ?? ctx.args[0];

    if (sub === "add") {
      const target = await ctx.getUser("user", true);
      const noteText = ctx.getString("note", true);
      if (!target || !noteText) return;
      await db.insert(modNotes).values({ guildId: ctx.guild.id, userId: target.id, moderatorId: ctx.user.id, note: noteText });
      return ctx.reply({ embeds: [successEmbed(`Note added for **${target.tag}**.`)] });
    }

    if (sub === "list") {
      const target = await ctx.getUser("user", true);
      if (!target) return;
      const notes = await db.select().from(modNotes).where(and(eq(modNotes.guildId, ctx.guild.id), eq(modNotes.userId, target.id)));
      if (notes.length === 0) return ctx.reply({ embeds: [brandEmbed({ title: "Mod Notes", description: `No notes found for **${target.tag}**.`, page: "Moderation" })] });
      const desc = notes.map((n) => `**#${n.id}** — <@${n.moderatorId}> • <t:${Math.floor(new Date(n.createdAt).getTime() / 1000)}:d>\n${n.note}`).join("\n\n");
      return ctx.reply({ embeds: [brandEmbed({ title: `Notes for ${target.tag}`, description: desc, page: "Moderation" })] });
    }

    if (sub === "delete") {
      const id = ctx.getNumber("id", true);
      if (!id) return;
      const rows = await db.select().from(modNotes).where(and(eq(modNotes.id, id), eq(modNotes.guildId, ctx.guild.id)));
      if (!rows[0]) return ctx.reply({ embeds: [errorEmbed("Note not found.")] });
      await db.delete(modNotes).where(eq(modNotes.id, id));
      return ctx.reply({ embeds: [successEmbed(`Note #${id} deleted.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid subcommand. Use add, list, or delete.")] });
  },
};
