import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { fakePermissions } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const VALID_PERMS = [
  "administrator", "manage_guild", "manage_channels", "manage_roles", "manage_messages",
  "manage_nicknames", "manage_webhooks", "kick_members", "ban_members", "mute_members",
  "deafen_members", "move_members", "moderate_members", "mention_everyone",
] as const;

export const command: HybridCommand = {
  name: "fakepermissions",
  aliases: ["fakeperm", "fakeperms", "fp"],
  description: "Grant a role fake permissions that the bot will treat as real for command access.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "fakepermissions (add|remove|list|reset) [role] [permission]",
  examples: [
    "fakepermissions add @Helper kick_members",
    "fakepermissions add @Moderator manage_messages",
    "fakepermissions remove @Helper kick_members",
    "fakepermissions list @Helper",
    "fakepermissions reset @Helper",
  ],
  options: [
    {
      name: "action",
      description: "add, remove, list, or reset",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
        { name: "reset", value: "reset" },
      ],
    },
    { name: "role", description: "Target role", type: ApplicationCommandOptionType.Role, required: false },
    { name: "permission", description: "Permission name", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const action = ctx.getString("action");
    const role = ctx.getRole("role");

    if (action === "list") {
      if (!role) {
        const all = await db.select().from(fakePermissions).where(eq(fakePermissions.guildId, guild.id));
        if (!all.length)
          return ctx.reply({ embeds: [errorEmbed("no fake permissions configured.")] });
        const lines = all.map((r) => `<@&${r.roleId}> — ${(r.permissions as string[]).join(", ")}`).join("\n");
        return ctx.reply({
          embeds: [brandEmbed({ description: `**fake permissions**\n\n${lines}`, page: "settings" })],
        });
      }

      const rows = await db.select().from(fakePermissions)
        .where(and(eq(fakePermissions.guildId, guild.id), eq(fakePermissions.roleId, role.id)));
      const perms = rows[0]?.permissions as string[] | undefined;
      if (!perms?.length)
        return ctx.reply({ embeds: [errorEmbed(`no fake permissions for <@&${role.id}>.`)] });
      return ctx.reply({
        embeds: [brandEmbed({ description: `**fake perms for <@&${role.id}>**\n\n${perms.join(", ")}`, page: "settings" })],
      });
    }

    if (!role) return ctx.reply({ embeds: [errorEmbed("please specify a role.")] });

    if (action === "reset") {
      await db.delete(fakePermissions).where(and(eq(fakePermissions.guildId, guild.id), eq(fakePermissions.roleId, role.id)));
      return ctx.reply({ embeds: [successEmbed(`reset all fake permissions for <@&${role.id}>.`, "settings")] });
    }

    const perm = ctx.getString("permission")?.toLowerCase();
    if (!perm) return ctx.reply({ embeds: [errorEmbed("please specify a permission.")] });
    if (!VALID_PERMS.includes(perm as typeof VALID_PERMS[number]))
      return ctx.reply({ embeds: [errorEmbed(`invalid permission.\n\nvalid options:\n\`\`\`\n${VALID_PERMS.join(", ")}\n\`\`\``)] });

    const rows = await db.select().from(fakePermissions)
      .where(and(eq(fakePermissions.guildId, guild.id), eq(fakePermissions.roleId, role.id)));
    const existing = (rows[0]?.permissions as string[]) ?? [];

    if (action === "add") {
      if (existing.includes(perm))
        return ctx.reply({ embeds: [errorEmbed(`<@&${role.id}> already has fake \`${perm}\`.`)] });
      const updated = [...existing, perm];
      await db.insert(fakePermissions).values({ guildId: guild.id, roleId: role.id, permissions: updated })
        .onConflictDoUpdate({ target: [fakePermissions.guildId, fakePermissions.roleId], set: { permissions: updated } });
      return ctx.reply({ embeds: [successEmbed(`granted fake \`${perm}\` to <@&${role.id}>.`, "settings")] });
    }

    if (action === "remove") {
      if (!existing.includes(perm))
        return ctx.reply({ embeds: [errorEmbed(`<@&${role.id}> doesn't have fake \`${perm}\`.`)] });
      const updated = existing.filter((p) => p !== perm);
      if (!updated.length) {
        await db.delete(fakePermissions).where(and(eq(fakePermissions.guildId, guild.id), eq(fakePermissions.roleId, role.id)));
      } else {
        await db.update(fakePermissions).set({ permissions: updated })
          .where(and(eq(fakePermissions.guildId, guild.id), eq(fakePermissions.roleId, role.id)));
      }
      return ctx.reply({ embeds: [successEmbed(`removed fake \`${perm}\` from <@&${role.id}>.`, "settings")] });
    }

    return ctx.reply({ embeds: [errorEmbed("invalid action.")] });
  },
};
