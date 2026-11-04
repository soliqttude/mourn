import { ApplicationCommandOptionType, type GuildMember } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { boosterRoles, boosterRoleConfig } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { createBoosterRole, deleteBoosterRole, getBoosterRole } from "../../features/boosterRoles.js";

export const command: HybridCommand = {
  name: "boosterrole",
  aliases: ["boostrole", "br"],
  description: "Manage your personal booster role — create, rename, color, or delete your custom role.",
  category: "settings",
  guildOnly: true,
  usage: "boosterrole (create|delete|remove|rename|color|random|icon|setbase|base|list|cleanup) [value]",
  examples: [
    "boosterrole create",
    "boosterrole rename My Awesome Role",
    "boosterrole color #ff0099",
    "boosterrole icon 🌙",
    "boosterrole delete",
    "boosterrole setbase @Nitro Booster",
  ],
  options: [
    {
      name: "action",
      description: "create, delete, remove, rename, color, random, icon, setbase, base, list, cleanup, link, or share",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "create", value: "create" },
        { name: "delete", value: "delete" },
        { name: "rename", value: "rename" },
        { name: "color", value: "color" },
        { name: "icon", value: "icon" },
        { name: "setbase", value: "setbase" },
        { name: "base", value: "base" },
        { name: "remove", value: "remove" },
        { name: "random", value: "random" },
        { name: "list", value: "list" },
        { name: "cleanup", value: "cleanup" },
        { name: "limit", value: "limit" }, { name: "award", value: "award" }, { name: "filter", value: "filter" },
        { name: "link", value: "link" }, { name: "share", value: "share" }, { name: "dominant", value: "dominant" },
      ],
    },
    { name: "value", description: "Name / color hex / emoji / base role", type: ApplicationCommandOptionType.String, required: false },
    { name: "role", description: "Role for base, linking, or awards", type: ApplicationCommandOptionType.Role, required: false },
    { name: "member", description: "Member to link or share the role with", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const member = ctx.member as GuildMember;

    const action = ctx.getString("action");

    if (action === "setbase" || action === "base") {
      if (!member.permissions.has("Administrator" as any))
        return ctx.reply({ embeds: [errorEmbed("Only admins can set the base **role**.")] });
      const role = ctx.getRole("role");
      if (!role) return ctx.reply({ embeds: [errorEmbed("Please specify the base **role**.")] });
      await db.insert(boosterRoleConfig).values({ guildId: guild.id, baseRoleId: role.id })
        .onConflictDoUpdate({ target: boosterRoleConfig.guildId, set: { baseRoleId: role.id } });
      return ctx.reply({ embeds: [successEmbed(`base role set to <@&${role.id}>. booster roles will be placed above it.`, "settings")] });
    }

    if (action === "list") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to list booster roles.")] });
      const rows = await db.select().from(boosterRoles).where(eq(boosterRoles.guildId, guild.id));
      const live = rows.filter((row) => guild.roles.cache.has(row.roleId));
      const body = live.length ? live.map((row) => `<@${row.userId}> — <@&${row.roleId}>`).join("\n") : "No active booster roles found.";
      return ctx.reply({ embeds: [brandEmbed(`**Booster roles (${live.length})**\n${body}`)] });
    }

    if (action === "cleanup") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to clean up booster roles.")] });
      const rows = await db.select().from(boosterRoles).where(eq(boosterRoles.guildId, guild.id));
      let removed = 0;
      for (const row of rows) {
        if (!guild.roles.cache.has(row.roleId) || !guild.members.cache.has(row.userId)) {
          await db.delete(boosterRoles).where(and(eq(boosterRoles.guildId, guild.id), eq(boosterRoles.userId, row.userId)));
          removed++;
        }
      }
      return ctx.reply({ embeds: [successEmbed(`Cleaned ${removed} stale booster role record(s).`, "settings")] });
    }

    // Administrators can link an existing role to a member; this uses the same
    // ownership table as roles created by boosters, so no parallel feature is introduced.
    if (action === "link") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to link booster roles.")] });
      const target = ctx.getMember("member") ?? (ctx.args[1] ? await guild.members.fetch(ctx.args[1].replace(/[<@!>]/g, "")).catch(() => null) : null);
      const linkedRole = ctx.getRole("role");
      if (!target || !linkedRole) return ctx.reply({ embeds: [errorEmbed("Provide both a member and an existing role.")] });
      await db.insert(boosterRoles).values({ guildId: guild.id, userId: target.id, roleId: linkedRole.id })
        .onConflictDoUpdate({ target: [boosterRoles.guildId, boosterRoles.userId], set: { roleId: linkedRole.id } });
      return ctx.reply({ embeds: [successEmbed(`linked <@&${linkedRole.id}> to <@${target.id}>.`, "settings")] });
    }

    const isBoosting = member.premiumSince !== null;
    if (!isBoosting)
      return ctx.reply({ embeds: [errorEmbed("You must be a server **booster** to use **booster** **roles**.")] });

    if (action === "create") {
      const existing = await getBoosterRole(guild.id, ctx.user.id);
      if (existing)
        return ctx.reply({ embeds: [errorEmbed(`you already have a booster role (<@&${existing}>). delete it first.`)] });

      const roleId = await createBoosterRole(guild, member);
      if (!roleId) return ctx.reply({ embeds: [errorEmbed("Failed to create **booster** **role**.")] });

      return ctx.reply({ embeds: [successEmbed(`your booster role (<@&${roleId}>) has been created! use \`boosterrole rename\` and \`boosterrole color\` to customize it.`, "settings")] });
    }

    if (action === "share") {
      const target = ctx.getMember("member") ?? (ctx.args[1] ? await guild.members.fetch(ctx.args[1].replace(/[<@!>]/g, "")).catch(() => null) : null);
      if (!target) return ctx.reply({ embeds: [errorEmbed("Mention a member to share your booster role with.")] });
      if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You already own this booster role.")] });
      const ownedRoleId = await getBoosterRole(guild.id, ctx.user.id);
      if (!ownedRoleId) return ctx.reply({ embeds: [errorEmbed("Create your booster role first.")] });
      const ownedRole = guild.roles.cache.get(ownedRoleId);
      if (!ownedRole) return ctx.reply({ embeds: [errorEmbed("Your booster role no longer exists.")] });
      if (action === "share") {
        await target.roles.add(ownedRole).catch(() => null);
        await db.insert(boosterRoles).values({ guildId: guild.id, userId: target.id, roleId: ownedRoleId })
          .onConflictDoUpdate({ target: [boosterRoles.guildId, boosterRoles.userId], set: { roleId: ownedRoleId } });
        return ctx.reply({ embeds: [successEmbed(`shared <@&${ownedRoleId}> with <@${target.id}>.`, "settings")] });
      }
    }

    const roleId = await getBoosterRole(guild.id, ctx.user.id);
    if (!roleId)
      return ctx.reply({ embeds: [errorEmbed("You don't have a **booster** **role**. use `boosterrole create` first.")] });

    const role = guild.roles.cache.get(roleId);
    if (!role)
      return ctx.reply({ embeds: [errorEmbed("Your **booster** **role** no longer exists.")] });

    if (action === "delete" || action === "remove") {
      await deleteBoosterRole(guild, ctx.user.id);
      return ctx.reply({ embeds: [successEmbed("Your **booster** **role** has been deleted.", "settings")] });
    }

    if (action === "rename") {
      const name = ctx.getString("value");
      if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a new name.")] });
      if (name.length > 100) return ctx.reply({ embeds: [errorEmbed("**Role** name must be 100 characters or less.")] });
      await role.setName(name).catch(() => null);
      return ctx.reply({ embeds: [successEmbed(`renamed your booster role to **${name}**.`, "settings")] });
    }

    if (action === "random") {
      const color = Math.floor(Math.random() * 0xffffff);
      await role.setColor(color);
      return ctx.reply({ embeds: [successEmbed("randomized your booster role color to #" + color.toString(16).padStart(6, "0") + ".", "settings")] });
    }

    if (action === "color") {
      const hex = ctx.getString("value");
      if (!hex) return ctx.reply({ embeds: [errorEmbed("Please provide a hex color e.g. `#ff0099`.")] });
      const parsed = parseInt(hex.replace("#", ""), 16);
      if (isNaN(parsed)) return ctx.reply({ embeds: [errorEmbed("Invalid hex color.")] });
      await role.setColor(parsed).catch(() => null);
      return ctx.reply({ embeds: [successEmbed(`updated your booster role color to \`${hex}\`.`, "settings")] });
    }

    if (action === "icon") {
      const icon = ctx.getString("value");
      if (!icon) return ctx.reply({ embeds: [errorEmbed("Please provide an **emoji** or image url.")] });
      await role.setUnicodeEmoji(icon).catch(async () => {
        if (/^https?:\/\//.test(icon)) {
          await role.setIcon(icon).catch(() => {});
        }
      });
      return ctx.reply({ embeds: [successEmbed(`updated your booster role icon.`, "settings")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid action.")] });
  },
};
