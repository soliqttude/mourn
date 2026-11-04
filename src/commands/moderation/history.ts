import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { and, desc, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "history",
  description: "View and manage a member's warning case history.",
  category: "moderation",
  guildOnly: true,
  userPermissions: ["ManageMessages"],
  options: [
    { name: "member", description: "Member whose history to view", type: ApplicationCommandOptionType.User, required: false },
    { name: "case", description: "Warning case ID", type: ApplicationCommandOptionType.Integer, required: false },
    { name: "action", description: "Optional action", type: ApplicationCommandOptionType.String, required: false, choices: [
      { name: "view", value: "view" }, { name: "remove", value: "remove" }, { name: "remove-all", value: "removeall" },
    ] },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? "view").toLowerCase();
    const caseId = ctx.getNumber("case");
    const target = await ctx.getUser("member").catch(() => null);
    if (action === "removeall") {
      if (!target) return ctx.reply({ content: "Specify the member whose warning history should be cleared.", ephemeral: true });
      if (!ctx.member?.permissions.has("Administrator")) return ctx.reply({ content: "Administrator permission is required to clear all warning cases.", ephemeral: true });
      const rows = await db.delete(warnings).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.userId, target.id))).returning({ id: warnings.id });
      return ctx.reply({ content: `Removed ${rows.length} warning case(s) for <@${target.id}>.`, allowedMentions: { parse: [] } });
    }
    if (action === "remove") {
      if (!caseId || caseId < 1) return ctx.reply({ content: "Provide a valid warning case ID.", ephemeral: true });
      const rows = await db.delete(warnings).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.id, caseId))).returning({ id: warnings.id });
      return ctx.reply({ content: rows.length ? `Removed warning case #${caseId}.` : "That warning case was not found.", ephemeral: true });
    }
    if (caseId) {
      const row = (await db.select().from(warnings).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.id, caseId))).limit(1))[0];
      if (!row) return ctx.reply({ content: "That warning case was not found.", ephemeral: true });
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle(`Warning case #${row.id}`).addFields(
        { name: "Member", value: `<@${row.userId}>`, inline: true },
        { name: "Moderator", value: `<@${row.moderatorId}>`, inline: true },
        { name: "Reason", value: row.reason },
        { name: "Created", value: `<t:${Math.floor(row.createdAt.getTime()/1000)}:F>` },
      )], allowedMentions: { parse: [] } });
    }
    if (!target) return ctx.reply({ content: "Specify a member or a case ID.", ephemeral: true });
    const rows = await db.select().from(warnings).where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.userId, target.id))).orderBy(desc(warnings.createdAt)).limit(20);
    if (!rows.length) return ctx.reply({ content: `No warning cases found for <@${target.id}>.`, allowedMentions: { parse: [] } });
    const lines = rows.map(row => `**#${row.id}** — ${row.reason} · <t:${Math.floor(row.createdAt.getTime()/1000)}:R> · moderator <@${row.moderatorId}>`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle(`Warning history for ${target.tag}`).setDescription(lines.join("\n").slice(0, 4000))], allowedMentions: { parse: [] } });
  },
};
