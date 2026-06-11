import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { antinukeWhitelist, antinukeAdmins } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { invalidateWhitelistCache, invalidateAdminCache, isAntinukeAdmin } from "../../features/antinuke.js";

export const command: HybridCommand = {
  name: "antinuke",
  description: "Configure anti-nuke protection.",
  usage: "antinuke [toggle|status|action|threshold|log|whitelist|admin] [value]",
  examples: ["antinuke", "antinuke status", "antinuke action ban", "antinuke whitelist @user", "antinuke admin add @user"],
  category: "settings",
  permission: "owner",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "(blank=toggle) status|action|threshold|log|whitelist|admin", type: ApplicationCommandOptionType.String, required: false },
    { name: "value", description: "ban|kick|strip · 2–10 · on/off · add/remove/list", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "For whitelist/admin", type: ApplicationCommandOptionType.User, required: false },
    { name: "channel", description: "For log", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const args = ctx.args;
    const sub = (ctx.getString("subcommand") ?? args[0] ?? "").toLowerCase();
    const value = ctx.getString("value") ?? args[1] ?? "";
    const targetUser = await ctx.getUser("user").catch(() => null);
    const logChannel = ctx.getChannel("channel");
    const settings = await getGuildSettings(ctx.guild.id);

    // Check if user is owner or antinuke admin
    const isAdmin = ctx.member
      ? await isAntinukeAdmin(ctx.guild.id, ctx.user.id, ctx.guild.ownerId)
      : ctx.user.id === ctx.guild.ownerId;

    // Admin subcommand is owner-only
    if (sub === "admin" && ctx.user.id !== ctx.guild.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("Only the server owner can manage antinuke admins.")] });
    }

    // Other subcommands require owner OR antinuke admin
    if (sub && sub !== "admin" && !isAdmin) {
      return ctx.reply({ embeds: [errorEmbed("You need to be the server owner or an antinuke admin.")] });
    }

    if (!sub) {
      if (!isAdmin) return ctx.reply({ embeds: [errorEmbed("You need to be the server owner or an antinuke admin.")] });
      const enabled = !settings.antinukeEnabled;
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: enabled });
      return ctx.reply({ embeds: [successEmbed(`antinuke is now **${enabled ? "enabled" : "disabled"}**.`)] });
    }

    if (sub === "status") {
      const wlRows = await db.select({ userId: antinukeWhitelist.userId }).from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
      const adminRows = await db.select({ userId: antinukeAdmins.userId }).from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id));
      const wlList = wlRows.length ? wlRows.map(r => `<@${r.userId}>`).join(", ") : "*none*";
      const adminList = adminRows.length ? adminRows.map(r => `<@${r.userId}>`).join(", ") : "*none*";
      return ctx.reply({ embeds: [brandEmbed({
        title: "antinuke status",
        fields: [
          { name: "enabled",    value: settings.antinukeEnabled ? "on" : "off", inline: true },
          { name: "punishment", value: `\`${settings.antinukeAction}\``, inline: true },
          { name: "threshold",  value: `${settings.antinukeThreshold ?? 3} actions / 10s`, inline: true },
          { name: "log",        value: settings.antinukeLogChannel ? `<#${settings.antinukeLogChannel}>` : "not set", inline: true },
          { name: "whitelist",  value: wlList.slice(0, 1024), inline: false },
          { name: "admins",     value: adminList.slice(0, 512), inline: false },
        ],
      })] });
    }

    if (sub === "action") {
      const v = value.toLowerCase();
      if (!["ban", "kick", "strip"].includes(v)) return ctx.reply({ embeds: [errorEmbed("Use: `ban`, `kick`, or `strip`.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeAction: v });
      return ctx.reply({ embeds: [successEmbed(`antinuke punishment set to **${v}**.`)] });
    }

    if (sub === "threshold") {
      const n = parseInt(value);
      if (isNaN(n) || n < 2 || n > 10) return ctx.reply({ embeds: [errorEmbed("Threshold must be 2–10.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeThreshold: n } as any);
      return ctx.reply({ embeds: [successEmbed(`threshold set to **${n}** actions per 10s.`)] });
    }

    if (sub === "log") {
      if (!logChannel && (!value || value.toLowerCase() === "off")) {
        await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: null } as any);
        return ctx.reply({ embeds: [successEmbed("Antinuke log disabled.")] });
      }
      const ch = logChannel ?? ctx.guild.channels.cache.get(value.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("**Channel** not found.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: ch.id } as any);
      return ctx.reply({ embeds: [successEmbed(`antinuke alerts → <#${ch.id}>.`)] });
    }

    if (sub === "whitelist") {
      const user = targetUser ?? (value ? await ctx.guild.client.users.fetch(value.replace(/[<@!>]/g, "")).catch(() => null) : null);
      if (!user) {
        const rows = await db.select({ userId: antinukeWhitelist.userId }).from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
        const list = rows.length ? rows.map((r, i) => `${i + 1}. <@${r.userId}>`).join("\n") : "*no whitelisted users.*";
        return ctx.reply({ embeds: [brandEmbed({ title: "antinuke whitelist", description: list })] });
      }
      const exists = await db.select().from(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
      if (exists.length) {
        await db.delete(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
        invalidateWhitelistCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`removed <@${user.id}> from the whitelist.`)] });
      }
      await db.insert(antinukeWhitelist).values({ guildId: ctx.guild.id, userId: user.id }).onConflictDoNothing();
      invalidateWhitelistCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`added <@${user.id}> to the whitelist.`)] });
    }

    if (sub === "admin") {
      const action = value.toLowerCase();
      const targetArg = args[2] ?? "";
      const targetId = targetArg.replace(/[<@!>]/g, "");

      if (action === "list") {
        const rows = await db.select({ userId: antinukeAdmins.userId }).from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No antinuke admins set.")] });
        return ctx.reply({ embeds: [brandEmbed({ title: "antinuke admins", description: rows.map((r, i) => `${i + 1}. <@${r.userId}>`).join("\n") })] });
      }

      if (!targetId) return ctx.reply({ embeds: [errorEmbed("Mention a **user**.")] });

      if (action === "add") {
        await db.insert(antinukeAdmins).values({ guildId: ctx.guild.id, userId: targetId }).onConflictDoNothing();
        invalidateAdminCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`<@${targetId}> can now manage antinuke settings.`)] });
      }

      if (action === "remove") {
        await db.delete(antinukeAdmins).where(and(eq(antinukeAdmins.guildId, ctx.guild.id), eq(antinukeAdmins.userId, targetId)));
        invalidateAdminCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`removed <@${targetId}> from antinuke admins.`)] });
      }

      return ctx.reply({ embeds: [errorEmbed("Use: `antinuke admin add|remove|list @user`")] });
    }

    return ctx.reply({ embeds: [brandEmbed({
      title: "antinuke",
      description: [
        "`,antinuke` — toggle on/off",
        "`,antinuke status`",
        "`,antinuke action <ban|kick|strip>`",
        "`,antinuke threshold <2-10>`",
        "`,antinuke log <#channel|off>`",
        "`,antinuke whitelist @user` — toggle whitelist",
        "`,antinuke admin add|remove|list @user`",
      ].join("\n"),
    })] });
  },
};
