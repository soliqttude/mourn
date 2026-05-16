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
  usage: "boosterrole (create|delete|rename|color|icon|setbase) [value]",
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
      description: "create, delete, rename, color, icon, or setbase",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "create", value: "create" },
        { name: "delete", value: "delete" },
        { name: "rename", value: "rename" },
        { name: "color", value: "color" },
        { name: "icon", value: "icon" },
        { name: "setbase", value: "setbase" },
      ],
    },
    { name: "value", description: "Name / color hex / emoji / base role", type: ApplicationCommandOptionType.String, required: false },
    { name: "role", description: "Base role for setbase", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const member = ctx.member as GuildMember;

    const action = ctx.getString("action");

    if (action === "setbase") {
      if (!member.permissions.has("Administrator" as any))
        return ctx.reply({ embeds: [errorEmbed("only admins can set the base role.")] });
      const role = ctx.getRole("role");
      if (!role) return ctx.reply({ embeds: [errorEmbed("please specify the base role.")] });
      await db.insert(boosterRoleConfig).values({ guildId: guild.id, baseRoleId: role.id })
        .onConflictDoUpdate({ target: boosterRoleConfig.guildId, set: { baseRoleId: role.id } });
      return ctx.reply({ embeds: [successEmbed(`base role set to <@&${role.id}>. booster roles will be placed above it.`, "settings")] });
    }

    const isBoosting = member.premiumSince !== null;
    if (!isBoosting)
      return ctx.reply({ embeds: [errorEmbed("you must be a server booster to use booster roles.")] });

    if (action === "create") {
      const existing = await getBoosterRole(guild.id, ctx.user.id);
      if (existing)
        return ctx.reply({ embeds: [errorEmbed(`you already have a booster role (<@&${existing}>). delete it first.`)] });

      const roleId = await createBoosterRole(guild, member);
      if (!roleId) return ctx.reply({ embeds: [errorEmbed("failed to create booster role.")] });

      return ctx.reply({ embeds: [successEmbed(`your booster role (<@&${roleId}>) has been created! use \`boosterrole rename\` and \`boosterrole color\` to customize it.`, "settings")] });
    }

    const roleId = await getBoosterRole(guild.id, ctx.user.id);
    if (!roleId)
      return ctx.reply({ embeds: [errorEmbed("you don't have a booster role. use `boosterrole create` first.")] });

    const role = guild.roles.cache.get(roleId);
    if (!role)
      return ctx.reply({ embeds: [errorEmbed("your booster role no longer exists.")] });

    if (action === "delete") {
      await deleteBoosterRole(guild, ctx.user.id);
      return ctx.reply({ embeds: [successEmbed("your booster role has been deleted.", "settings")] });
    }

    if (action === "rename") {
      const name = ctx.getString("value");
      if (!name) return ctx.reply({ embeds: [errorEmbed("please provide a new name.")] });
      if (name.length > 100) return ctx.reply({ embeds: [errorEmbed("role name must be 100 characters or less.")] });
      await role.setName(name).catch(() => null);
      return ctx.reply({ embeds: [successEmbed(`renamed your booster role to **${name}**.`, "settings")] });
    }

    if (action === "color") {
      const hex = ctx.getString("value");
      if (!hex) return ctx.reply({ embeds: [errorEmbed("please provide a hex color e.g. `#ff0099`.")] });
      const parsed = parseInt(hex.replace("#", ""), 16);
      if (isNaN(parsed)) return ctx.reply({ embeds: [errorEmbed("invalid hex color.")] });
      await role.setColor(parsed).catch(() => null);
      return ctx.reply({ embeds: [successEmbed(`updated your booster role color to \`${hex}\`.`, "settings")] });
    }

    if (action === "icon") {
      const icon = ctx.getString("value");
      if (!icon) return ctx.reply({ embeds: [errorEmbed("please provide an emoji or image url.")] });
      await role.setUnicodeEmoji(icon).catch(async () => {
        if (/^https?:\/\//.test(icon)) {
          await role.setIcon(icon).catch(() => {});
        }
      });
      return ctx.reply({ embeds: [successEmbed(`updated your booster role icon.`, "settings")] });
    }

    return ctx.reply({ embeds: [errorEmbed("invalid action.")] });
  },
};
