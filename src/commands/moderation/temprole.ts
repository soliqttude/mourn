import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { and, eq, asc } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { db } from "../../db/index.js";
import { tempRoles } from "../../db/schema.js";
import { resolveMember, resolveRole } from "../../lib/parsing.js";
import { parseDuration } from "../../lib/time.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "temprole",
  description: "Temporarily assign a role to a member or list active temporary roles.",
  category: "moderation",
  permission: "manage_roles",
  guildOnly: true,
  options: [
    { name: "action", description: "Add a temporary role or list active assignments", type: ApplicationCommandOptionType.String, required: false, choices: [{ name: "add", value: "add" }, { name: "list", value: "list" }] },
    { name: "member", description: "Member who receives the role", type: ApplicationCommandOptionType.User, required: false },
    { name: "duration", description: "How long to keep the role (e.g. 30m, 2h, 7d)", type: ApplicationCommandOptionType.String, required: false },
    { name: "role", description: "Role to assign", type: ApplicationCommandOptionType.Role, required: false }
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const prefixOffset = ctx.source === "prefix" && ["add", "list"].includes((ctx.args[0] ?? "").toLowerCase()) ? 1 : 0;
    const action = (ctx.getString("action") ?? (ctx.source === "prefix" ? (ctx.args[0]?.toLowerCase() === "list" ? "list" : "add") : "add")).toLowerCase();

    if (action === "list") {
      const rows = await db.select().from(tempRoles).where(eq(tempRoles.guildId, guild.id)).orderBy(asc(tempRoles.expiresAt)).limit(40);
      if (!rows.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Temporary roles").setDescription("No active temporary roles are recorded.")] });
      const lines = rows.map(row => "<@" + row.userId + "> — <@&" + row.roleId + "> expires <t:" + Math.floor(row.expiresAt.getTime() / 1000) + ":R>");
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Temporary roles (" + rows.length + ")").setDescription(lines.join("\\n").slice(0, 4000))], allowedMentions: { parse: [] } });
    }
    if (action !== "add") return ctx.reply({ embeds: [errorEmbed("Choose add or list.")] });

    const member = ctx.source === "prefix"
      ? await resolveMember(guild, ctx.args[prefixOffset] ?? "")
      : await ctx.getMember("member");
    const duration = ctx.getString("duration") ?? (ctx.source === "prefix" ? ctx.args[prefixOffset + 1] : null);
    const role = ctx.source === "prefix"
      ? resolveRole(guild, ctx.args[prefixOffset + 2] ?? "")
      : ctx.getRole("role");
    if (!member || !duration || !role) return ctx.reply({ embeds: [errorEmbed("Usage: temprole <member> <duration> <role>.")] });
    if (member.id === guild.ownerId) return ctx.reply({ embeds: [errorEmbed("The server owner cannot receive a temporary role through this command.")] });
    if (role.id === guild.id || role.managed || role.position >= (guild.members.me?.roles.highest.position ?? 0)) {
      return ctx.reply({ embeds: [errorEmbed("That role is managed, everyone, or above my highest role.")] });
    }
    if (!role.editable || !guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ embeds: [errorEmbed("I need Manage Roles and a higher role position to assign that role.")] });
    }
    if (ctx.member && member.roles.highest.position >= ctx.member.roles.highest.position && ctx.user.id !== guild.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("You cannot assign a temporary role to a member with an equal or higher role.")] });
    }
    if (role.position >= (ctx.member?.roles.highest.position ?? 0) && ctx.user.id !== guild.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("You cannot assign a role equal to or above your highest role.")] });
    }
    const durationMs = parseDuration(duration);
    if (!durationMs || durationMs < 60_000 || durationMs > 365 * 24 * 60 * 60 * 1000) {
      return ctx.reply({ embeds: [errorEmbed("Use a duration from 1 minute to 365 days, such as 30m, 2h, or 7d.")] });
    }
    const expiresAt = new Date(Date.now() + durationMs);
    try {
      await member.roles.add(role, "Temporary role assigned by " + ctx.user.tag);
      await db.delete(tempRoles).where(and(eq(tempRoles.guildId, guild.id), eq(tempRoles.userId, member.id), eq(tempRoles.roleId, role.id)));
      await db.insert(tempRoles).values({ guildId: guild.id, userId: member.id, roleId: role.id, addedBy: ctx.user.id, expiresAt });
      return ctx.reply({ embeds: [successEmbed("Assigned <@&" + role.id + "> to **" + member.user.tag + "** until <t:" + Math.floor(expiresAt.getTime() / 1000) + ":F>.")], allowedMentions: { parse: [] } });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not assign the temporary role.")] });
    }
  }
};
