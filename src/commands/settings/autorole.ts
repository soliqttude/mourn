import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

function roleIdFrom(raw?: string): string | null {
  return raw?.replace(/[<@&>]/g, "").trim() || null;
}

export const command: HybridCommand = {
  name: "autorole",
  description: "Configure roles that are automatically assigned to new members.",
  usage: "autorole | autorole add <role> | autorole remove <role> | autorole reset | autorole list",
  examples: ["autorole add @role", "autorole remove @role", "autorole list"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  userPermissions: ["ManageGuild", "ManageRoles"],
  options: [
    { name: "action", description: "add | remove | reset | list", type: ApplicationCommandOptionType.String, required: false, choices: [
      { name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "reset", value: "reset" }, { name: "list", value: "list" },
    ] },
    { name: "role", description: "Role to add or remove", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ embeds: [errorEmbed("You need Manage Guild and Manage Roles to configure autoroles.")] });
    }
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const selectedRole = ctx.getRole("role");
    const roleId = selectedRole?.id ?? roleIdFrom(ctx.args[1] ?? ctx.args[0]);
    const settings = await getGuildSettings(ctx.guild.id);
    const ids = String(settings.autoroleId ?? "").split(",").map(x => x.trim()).filter(Boolean);

    if (!action) {
      return ctx.reply({ embeds: [brandEmbed({ title: "Autorole", description: "Automatically assign configured roles when a member joins.\n\nUse `,autorole add @role` to add a role, or `,autorole list` to view them." })] });
    }
    if (action === "list") {
      const valid = ids.filter(id => ctx.guild!.roles.cache.has(id));
      return ctx.reply({ embeds: [brandEmbed({ title: "Automatic Roles", description: valid.length ? valid.map(id => `<@&${id}>`).join("\n") : "No autoroles configured." })] });
    }
    if (action === "reset") {
      await updateGuildSettings(ctx.guild.id, { autoroleId: null });
      return ctx.reply({ embeds: [successEmbed("All autoroles have been cleared.")] });
    }
    if (action !== "add" && action !== "remove") {
      return ctx.reply({ embeds: [errorEmbed("Use `,autorole add @role`, `,autorole remove @role`, `,autorole reset`, or `,autorole list`.")] });
    }
    if (!roleId) return ctx.reply({ embeds: [errorEmbed("Please provide a role.")] });
    const role = ctx.guild.roles.cache.get(roleId);
    if (!role) return ctx.reply({ embeds: [errorEmbed("That role was not found in this server.")] });
    if (role.managed || role.id === ctx.guild.id) return ctx.reply({ embeds: [errorEmbed("That role cannot be assigned automatically.")] });
    const botMember = ctx.guild.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) return ctx.reply({ embeds: [errorEmbed("I cannot assign that role. Move my highest role above it first.")] });
    if (action === "add") {
      if (ids.includes(roleId)) return ctx.reply({ embeds: [errorEmbed("That role is already an autorole.")] });
      ids.push(roleId);
    } else {
      if (!ids.includes(roleId)) return ctx.reply({ embeds: [errorEmbed("That role is not in the autorole list.")] });
      const next = ids.filter(id => id !== roleId);
      await updateGuildSettings(ctx.guild.id, { autoroleId: next.length ? next.join(",") : null });
      return ctx.reply({ embeds: [successEmbed(`Removed <@&${roleId}> from autoroles.`)] });
    }
    await updateGuildSettings(ctx.guild.id, { autoroleId: ids.join(",") });
    return ctx.reply({ embeds: [successEmbed(`Added <@&${roleId}> to autoroles. New members will receive it when they join.`)] });
  },
};
