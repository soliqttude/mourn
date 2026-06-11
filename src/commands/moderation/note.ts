import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { modNotes } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "note",
  aliases: ["addnote", "staffnote"],
  description: "Manage moderator notes on users.",
  usage: "note [action] [user] [text] [id]",
  examples: ["note"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "action", description: "add · list · delete", type: ApplicationCommandOptionType.String, required: true },
    { name: "user", description: "Target user (add or list)", type: ApplicationCommandOptionType.User, required: false },
    { name: "text", description: "Note content (for add)", type: ApplicationCommandOptionType.String, required: false },
    { name: "id", description: "Note ID to delete", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "").toLowerCase();

    if (action === "add") {
      const target = await ctx.getUser("user");
      const noteText = ctx.getString("text") ?? ctx.rawArgs.split(/\s+/).slice(2).join(" ").trim();
      if (!target) return ctx.reply({ embeds: [errorEmbed("Please specify a **user**.")] });
      if (!noteText) return ctx.reply({ embeds: [errorEmbed("Please provide **note** text.")] });
      await db.insert(modNotes).values({ guildId: guild.id, userId: target.id, moderatorId: ctx.user.id, note: noteText });
      return ctx.reply({ embeds: [successEmbed(`Note added for **${target.tag}**.`)] });
    }

    if (action === "list") {
      const target = await ctx.getUser("user");
      if (!target) return ctx.reply({ embeds: [errorEmbed("Please specify a **user**.")] });
      const notes = await db.select().from(modNotes).where(and(eq(modNotes.guildId, guild.id), eq(modNotes.userId, target.id)));
      if (notes.length === 0) return ctx.reply({ embeds: [brandEmbed({ title: "Mod Notes", description: `No notes found for **${target.tag}**.`, page: "Moderation" })] });
      const desc = notes.map((n) => `**#${n.id}** — <@${n.moderatorId}> • <t:${Math.floor(new Date(n.createdAt).getTime() / 1000)}:d>\n${n.note}`).join("\n\n");
      return ctx.reply({ embeds: [brandEmbed({ title: `Notes for ${target.tag}`, description: desc, page: "Moderation" })] });
    }

    if (action === "delete") {
      const id = ctx.getNumber("id") ?? parseInt(ctx.args[1] ?? "");
      if (!id || isNaN(id)) return ctx.reply({ embeds: [errorEmbed("Please provide a **note** ID.")] });
      const rows = await db.select().from(modNotes).where(and(eq(modNotes.id, id), eq(modNotes.guildId, guild.id)));
      if (!rows[0]) return ctx.reply({ embeds: [errorEmbed("**Note** not found.")] });
      await db.delete(modNotes).where(eq(modNotes.id, id));
      return ctx.reply({ embeds: [successEmbed(`Note #${id} deleted.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Usage: `/**note** add/list/delete`")] });
  },
};
