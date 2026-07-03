import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { boostAutoRole } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "setboostrole",
  aliases: ["boostrole", "boostautorole"],
  description: "Set a role that gets auto-assigned when someone boosts.",
  usage: "setboostrole <@role | none>",
  examples: ["setboostrole @Booster", "setboostrole none"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    {
      name: "role",
      description: "Role to assign on boost",
      type: ApplicationCommandOptionType.Role,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const roleArg = ctx.args[0]?.toLowerCase();

    // View current
    if (!roleArg && !ctx.getRole("role")) {
      const [cfg] = await db.select().from(boostAutoRole).where(eq(boostAutoRole.guildId, ctx.guild.id)).catch(() => []);
      if (!cfg) return ctx.reply({ embeds: [brandEmbed({ title: "Boost Role", description: "no boost role set. use `,setboostrole @role` to set one." })] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Boost Role", description: `current boost role: <@&${cfg.roleId}>` })] });
    }

    // Disable
    if (roleArg === "none" || roleArg === "off" || roleArg === "disable") {
      await db.delete(boostAutoRole).where(eq(boostAutoRole.guildId, ctx.guild.id)).catch(() => {});
      return ctx.reply({ embeds: [successEmbed("boost role disabled.", "settings")] });
    }

    // Set role
    const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(ctx.args[0]?.replace(/[<@&>]/g, "") ?? "");
    if (!role) return ctx.reply({ embeds: [errorEmbed("provide a valid role or use `none` to disable.")] });
    if (role.managed) return ctx.reply({ embeds: [errorEmbed("cannot use a bot-managed role.")] });

    await db.insert(boostAutoRole)
      .values({ guildId: ctx.guild.id, roleId: role.id })
      .onConflictDoUpdate({ target: boostAutoRole.guildId, set: { roleId: role.id } })
      .catch(() => {});

    return ctx.reply({ embeds: [successEmbed(`boost role set to <@&${role.id}>. anyone who boosts will get it automatically.`, "settings")] });
  },
};
