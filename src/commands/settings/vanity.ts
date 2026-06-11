import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { vanityConfig, vanityRoles } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { resolveRole, resolveChannel } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "vanity",
  description: "Configure vanity role rewards. Users get roles for putting the vanity in their status.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "vanity [set|roles add|roles remove|roles list|channel|message|status]",
  examples: [
    "vanity set /yourcoolserver",
    "vanity roles add @Vanity",
    "vanity channel #general",
    "vanity message {user(mention)} has our vanity!",
    "vanity status",
  ],
  options: [
    { name: "subcommand", description: "set | roles | channel | message | status", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "Vanity string, role, channel, or message", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const guildId = ctx.guild.id;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const value = ctx.getString("value") ?? ctx.args.slice(1).join(" ");

    if (sub === "set") {
      if (!value) return ctx.reply({ embeds: [errorEmbed("Provide a vanity string (e.g. `/yourcoolserver`).")] });
      await db.insert(vanityConfig).values({ guildId, vanity: value }).onConflictDoUpdate({ target: vanityConfig.guildId, set: { vanity: value } });
      return ctx.reply({ embeds: [successEmbed(`vanity set to \`${value}\`. members with this in their status will receive vanity roles.`)] });
    }

    if (sub === "roles") {
      const action = (ctx.args[1] ?? "").toLowerCase();
      const roleStr = ctx.args[2] ?? value;
      if (action === "add") {
        const role = resolveRole(ctx.guild, roleStr);
        if (!role) return ctx.reply({ embeds: [errorEmbed("**Role** not found.")] });
        await db.insert(vanityRoles).values({ guildId, roleId: role.id }).onConflictDoNothing();
        return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> added to vanity roles.`)] });
      }
      if (action === "remove") {
        const role = resolveRole(ctx.guild, roleStr);
        if (!role) return ctx.reply({ embeds: [errorEmbed("**Role** not found.")] });
        await db.delete(vanityRoles).where(and(eq(vanityRoles.guildId, guildId), eq(vanityRoles.roleId, role.id)));
        return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> removed from vanity roles.`)] });
      }
      const rows = await db.select().from(vanityRoles).where(eq(vanityRoles.guildId, guildId));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No vanity **roles** set.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Vanity Roles", description: rows.map(r => `<@&${r.roleId}>`).join("\n") })] });
    }

    if (sub === "channel") {
      if (!value) return ctx.reply({ embeds: [errorEmbed("Provide a **channel**.")] });
      const ch = resolveChannel(ctx.guild, value);
      if (!ch) return ctx.reply({ embeds: [errorEmbed("**Channel** not found.")] });
      await db.insert(vanityConfig).values({ guildId, vanity: "" }).onConflictDoUpdate({ target: vanityConfig.guildId, set: { channelId: ch.id } });
      return ctx.reply({ embeds: [successEmbed(`vanity notification channel set to <#${ch.id}>.`)] });
    }

    if (sub === "message") {
      if (!value) return ctx.reply({ embeds: [errorEmbed("Provide a message. supports scripting variables.")] });
      await db.insert(vanityConfig).values({ guildId, vanity: "" }).onConflictDoUpdate({ target: vanityConfig.guildId, set: { message: value } });
      return ctx.reply({ embeds: [successEmbed("Vanity message updated.")] });
    }

    if (sub === "status") {
      const cfg = await db.select().from(vanityConfig).where(eq(vanityConfig.guildId, guildId));
      const roles = await db.select().from(vanityRoles).where(eq(vanityRoles.guildId, guildId));
      const c = cfg[0];
      return ctx.reply({ embeds: [brandEmbed({ title: "Vanity Config", fields: [
        { name: "vanity", value: c?.vanity || "not set", inline: true },
        { name: "roles", value: roles.map(r => `<@&${r.roleId}>`).join(", ") || "none", inline: true },
        { name: "channel", value: c?.channelId ? `<#${c.channelId}>` : "not set", inline: true },
        { name: "message", value: c?.message || "not set", inline: false },
      ] })] });
    }

    return ctx.reply({ embeds: [brandEmbed({ description: "**subcommands:** set, roles add/remove/list, channel, message, status" })] });
  },
};
