import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { badgeConfig, badgeRoles } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "badge",
  description: "Award server badges to members with certain roles.",
  usage: "badge <channel|message|message view|role add|role remove|role list|sync> [args]",
  examples: [
    "badge channel #badges",
    "badge message {embed}$v{description: You earned a badge!}",
    "badge role add @Veteran",
    "badge role list",
    "badge sync",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "channel | message | message view | role add | role remove | role list | sync", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "Channel, message content, or role", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Badge announcement channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Role to add/remove from badge list", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rawSub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const sub = ctx.args.slice(0, 2).join(" ").toLowerCase() || rawSub;

    if (sub === "channel") {
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(ctx.args[1]?.replace(/[<#>]/g, "") ?? "");
      if (!ch) return ctx.reply({ embeds: [errorEmbed("please provide a channel.")] });
      await db.insert(badgeConfig).values({ guildId: ctx.guild.id, channelId: ch.id, message: null, enabled: true })
        .onConflictDoUpdate({ target: badgeConfig.guildId, set: { channelId: ch.id, enabled: true } });
      return ctx.reply({ embeds: [successEmbed(`badge announcements set to <#${ch.id}>.`)] });
    }

    if (sub === "message view") {
      const [cfg] = await db.select().from(badgeConfig).where(eq(badgeConfig.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [brandEmbed({ title: "Badge Message", description: cfg?.message ?? "*(not set)*" })] });
    }

    if (sub === "message") {
      const msg = ctx.getString("value") ?? ctx.args.slice(1).join(" ");
      if (!msg) return ctx.reply({ embeds: [errorEmbed("please provide a message.")] });
      await db.insert(badgeConfig).values({ guildId: ctx.guild.id, channelId: null, message: msg, enabled: true })
        .onConflictDoUpdate({ target: badgeConfig.guildId, set: { message: msg } });
      return ctx.reply({ embeds: [successEmbed("badge message updated.")] });
    }

    if (sub === "role list" || sub === "role") {
      const rows = await db.select().from(badgeRoles).where(eq(badgeRoles.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no badge roles configured.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Badge Roles", description: rows.map(r => `<@&${r.roleId}>`).join("\n") })] });
    }

    if (sub === "role add") {
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(ctx.args[2]?.replace(/[<@&>]/g, "") ?? "");
      if (!role) return ctx.reply({ embeds: [errorEmbed("please provide a role.")] });
      await db.insert(badgeRoles).values({ guildId: ctx.guild.id, roleId: role.id }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> added to badge roles.`)] });
    }

    if (sub === "role remove") {
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(ctx.args[2]?.replace(/[<@&>]/g, "") ?? "");
      if (!role) return ctx.reply({ embeds: [errorEmbed("please provide a role.")] });
      await db.delete(badgeRoles).where(and(eq(badgeRoles.guildId, ctx.guild.id), eq(badgeRoles.roleId, role.id)));
      return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> removed from badge roles.`)] });
    }

    if (sub === "sync") {
      const [cfg] = await db.select().from(badgeConfig).where(eq(badgeConfig.guildId, ctx.guild.id));
      const badgeRoleRows = await db.select().from(badgeRoles).where(eq(badgeRoles.guildId, ctx.guild.id));
      if (!cfg?.channelId || !badgeRoleRows.length) return ctx.reply({ embeds: [errorEmbed("set a badge channel and at least one badge role first.")] });
      const ch = ctx.guild.channels.cache.get(cfg.channelId) as any;
      if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("badge channel not found.")] });
      const members = await ctx.guild.members.fetch();
      let announced = 0;
      for (const [, member] of members) {
        for (const row of badgeRoleRows) {
          if (member.roles.cache.has(row.roleId)) {
            await ch.send({ content: `<@${member.id}> ${cfg.message ?? "earned a badge!"}` }).catch(() => null);
            announced++;
            break;
          }
        }
      }
      return ctx.reply({ embeds: [successEmbed(`synced ${announced} badge announcement${announced === 1 ? "" : "s"}.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("unknown subcommand. use: channel | message | role add | role remove | role list | sync")] });
  },
};
