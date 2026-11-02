import { ApplicationCommandOptionType, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { antinukeWhitelist, antinukeAdmins, antinukeModules, antinukePermissionWatches } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import {
  invalidateWhitelistCache,
  invalidateAdminCache,
  invalidateModuleCache,
  isAntinukeAdmin,
  getModuleConfigs,
  ANTINUKE_WATCH_PERMISSIONS,
  listAntinukePermissionWatches,
} from "../../features/antinuke.js";

const MODULES = ["ban", "kick", "channel", "role", "emoji", "webhook", "botadd", "vanity", "permissions"] as const;
type Module = typeof MODULES[number];

const MODULE_LABELS: Record<Module, string> = {
  ban:     "ban",
  kick:    "kick",
  channel: "channel",
  role:    "role",
  emoji:   "emoji",
  webhook: "webhook",
  botadd:  "bot add",
  vanity:  "vanity",
  permissions: "permissions",
};

// Modules that support --threshold and --command flags
const HAS_THRESHOLD = new Set<Module>(["ban", "kick", "channel", "role", "emoji", "webhook"]);
const HAS_COMMAND   = new Set<Module>(["ban", "kick", "role"]);

interface Flags {
  threshold?: number;
  do?: string;
  command?: boolean;
}

/** Parse --threshold N  --do punishment  --command on|off from raw args */
function parseFlags(args: string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i]?.toLowerCase();
    const next = args[i + 1];
    if ((a === "--threshold" || a === "-threshold") && next) {
      const n = parseInt(next);
      if (!isNaN(n) && n >= 1) out.threshold = n;
      i++;
    } else if ((a === "--do" || a === "-do") && next) {
      const p = next.toLowerCase();
      if (["ban", "kick", "timeout", "strip", "stripstaff", "jail"].includes(p)) out.do = p;
      i++;
    } else if ((a === "--command" || a === "-command") && next) {
      out.command = ["on", "true", "yes", "1"].includes(next.toLowerCase());
      i++;
    }
  }
  return out;
}

async function resolveUser(ctx: any, raw: string) {
  try {
    const u = await ctx.getUser?.("user");
    if (u) return u;
  } catch {}
  const id = raw?.replace(/[<@!>]/g, "").trim();
  if (/^\d{15,20}$/.test(id)) {
    return ctx.guild!.client.users.fetch(id).catch(() => null);
  }
  return null;
}

export const command: HybridCommand = {
  name: "antinuke",
  aliases: ["an"],
  description: "Configure AntiNuke protection; use fake permissions to reduce mass-action bypass risk.",
  usage: "/antinuke config | /antinuke <module> setting punishment threshold command_detection | /antinuke permissions watch|unwatch|list | /antinuke admin|whitelist add|remove",
  examples: [
    "/antinuke config",
    "/antinuke ban setting:On punishment:ban threshold:3 command_detection:False",
    "/antinuke kick setting:On punishment:timeout threshold:2 command_detection:True",
    "/antinuke role setting:On punishment:strip threshold:3 command_detection:False",
    "/antinuke channel setting:On punishment:ban threshold:3",
    "/antinuke botadd setting:On",
    "/antinuke vanity setting:On punishment:ban",
    "/antinuke permissions watch direction:granted permission:manage_roles",
    "/antinuke permissions unwatch direction:removed permission:administrator",
    "/antinuke admin add user:@user",
    "/antinuke whitelist add user:@bot",
  ],
  category: "settings",
  permission: "everyone",
  guildOnly: true,
  options: [
    { type: ApplicationCommandOptionType.Subcommand, name: "config", description: "Open AntiNuke configuration" },
    ...(["ban", "kick", "role", "channel", "emoji", "webhook", "botadd", "vanity"] as const).map((name) => ({
      type: ApplicationCommandOptionType.Subcommand,
      name,
      description: `Configure ${name} protection`,
      options: [
        { type: ApplicationCommandOptionType.String, name: "setting", description: "On or Off", required: true, choices: [{ name: "On", value: "on" }, { name: "Off", value: "off" }] },
        ...(name === "botadd" ? [] : [{ type: ApplicationCommandOptionType.String, name: "punishment", description: "Action to take", required: name !== "botadd", choices: ["ban", "kick", "timeout", "strip", "stripstaff", "jail"].map((value) => ({ name: value, value })) }]),
        ...(["ban", "kick", "role", "channel", "emoji", "webhook"].includes(name) ? [{ type: ApplicationCommandOptionType.Integer, name: "threshold", description: "Number of actions before punishment", required: true, min_value: 1, max_value: 100 }] : []),
        ...(["ban", "kick", "role"].includes(name) ? [{ type: ApplicationCommandOptionType.Boolean, name: "command_detection", description: "Count actions performed using Villain commands", required: true }] : []),
      ],
    })),
    { type: ApplicationCommandOptionType.SubcommandGroup, name: "admin", description: "Manage AntiNuke admins", options: [
      { type: ApplicationCommandOptionType.Subcommand, name: "add", description: "Grant configuration access", options: [{ type: ApplicationCommandOptionType.User, name: "user", description: "User to grant access to", required: true }] },
      { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Revoke configuration access", options: [{ type: ApplicationCommandOptionType.User, name: "user", description: "User to remove", required: true }] },
    ] },
    { type: ApplicationCommandOptionType.SubcommandGroup, name: "whitelist", description: "Manage trusted users and bots", options: [
      { type: ApplicationCommandOptionType.Subcommand, name: "add", description: "Whitelist a user or bot", options: [{ type: ApplicationCommandOptionType.User, name: "user", description: "User or bot to whitelist", required: true }] },
      { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Remove a whitelist entry", options: [{ type: ApplicationCommandOptionType.User, name: "user", description: "User or bot to remove", required: true }] },
    ] },
    { type: ApplicationCommandOptionType.SubcommandGroup, name: "permissions", description: "Watch role permission changes", options: [
      { type: ApplicationCommandOptionType.Subcommand, name: "watch", description: "Revert a permission being granted or removed", options: [
        { type: ApplicationCommandOptionType.String, name: "direction", description: "Permission change direction", required: true, choices: [{ name: "Granted", value: "granted" }, { name: "Removed", value: "removed" }] },
        { type: ApplicationCommandOptionType.String, name: "permission", description: "Permission to watch", required: true, choices: Object.keys(ANTINUKE_WATCH_PERMISSIONS).map((value) => ({ name: value, value })) },
      ] },
      { type: ApplicationCommandOptionType.Subcommand, name: "unwatch", description: "Stop watching a permission change", options: [
        { type: ApplicationCommandOptionType.String, name: "direction", description: "Permission change direction", required: true, choices: [{ name: "Granted", value: "granted" }, { name: "Removed", value: "removed" }] },
        { type: ApplicationCommandOptionType.String, name: "permission", description: "Permission to stop watching", required: true, choices: Object.keys(ANTINUKE_WATCH_PERMISSIONS).map((value) => ({ name: value, value })) },
      ] },
      { type: ApplicationCommandOptionType.Subcommand, name: "list", description: "List watched permissions" },
    ] },
  ] as any,
  async execute(ctx) {
    if (!ctx.guild) return;

    const args = ctx.args;
    const slashGroup = ctx.source === "slash" ? ctx.getSubcommandGroup(false) : null;
    const slashSub = ctx.source === "slash" ? ctx.getSubcommand(false) : null;
    const sub = (ctx.source === "slash" ? (slashGroup ?? slashSub ?? "") : (args[0] ?? "")).toLowerCase();
    const arg1 = (ctx.source === "slash"
      ? (slashGroup ? (slashSub ?? "") : (ctx.getString("setting") ?? ""))
      : (args[1] ?? "")).toLowerCase();
    const arg2 = (ctx.source === "slash"
      ? (slashGroup === "permissions" ? (ctx.getString("direction") ?? "") : (ctx.getString("punishment") ?? ""))
      : (args[2] ?? "")).toLowerCase();
    const arg3 = (ctx.source === "slash"
      ? (slashGroup === "permissions" ? (ctx.getString("permission") ?? "") : String(ctx.getNumber("threshold") ?? ""))
      : (args[3] ?? "")).toLowerCase();

    const settings = await getGuildSettings(ctx.guild.id);
    const isOwner  = ctx.user.id === ctx.guild.ownerId;
    const isAdmin  = await isAntinukeAdmin(ctx.guild.id, ctx.user.id, ctx.guild.ownerId);

    if (!isAdmin) {
      return ctx.reply({ embeds: [errorEmbed("you must be the server **owner** or an **antinuke admin**.")] });
    }

    // ── config / list / admins ───────────────────────────────────────────────
    if (sub === "config") {
      const modules = await getModuleConfigs(ctx.guild.id);
      const enabled = MODULES.filter((name) => modules.get(name)?.enabled);
      const lines = MODULES.map((name) => {
        const active = modules.get(name)?.enabled ? "enabled" : "disabled";
        return "**" + MODULE_LABELS[name] + "** — " + active;
      });
      const select = new StringSelectMenuBuilder()
        .setCustomId("antinuke:config-select:" + ctx.guild.id + ":" + ctx.user.id)
        .setPlaceholder("Select an AntiNuke module")
        .addOptions(MODULES.map((name) => ({
          label: MODULE_LABELS[name],
          value: name,
          description: modules.get(name)?.enabled ? "Currently enabled" : "Currently disabled",
        })));
      return ctx.reply({
        embeds: [brandEmbed({
          title: "AntiNuke configuration",
          description: [
            "**Enabled modules** — " + (enabled.map((name) => MODULE_LABELS[name]).join(", ") || "none"),
            "",
            ...lines,
            "",
            "Select a module below to open its settings. Fake permissions are recommended for staff roles to reduce mass-ban bypass risk.",
          ].join("\n"),
        })],
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
        ephemeral: true,
      });
    }

    if (sub === "admins") {
      const rows = await db.select().from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [brandEmbed({
        title: "antinuke admins",
        description: rows.length ? rows.map((r, i) => `${i + 1}. <@${r.userId}> (\`${r.userId}\`)`).join("\\n") : "no antinuke admins set.",
      })] });
    }

    if (sub === "list") {
      const rows = await db.select().from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
      const modules = await getModuleConfigs(ctx.guild.id);
      const enabled = MODULES.filter(m => modules.get(m)?.enabled).map(m => `**${MODULE_LABELS[m]}**`).join(", ") || "none";
      return ctx.reply({ embeds: [brandEmbed({
        title: "antinuke list",
        description: [`**enabled modules** — ${enabled}`, "", `**whitelisted** — ${rows.length ? rows.map(r => `<@${r.userId}>`).join(", ") : "none"}`].join("\\n"),
      })] });
    }

    // ── enable / disable ─────────────────────────────────────────────────────
    if (sub === "enable") {
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: true });
      return ctx.reply({ embeds: [successEmbed("antinuke has been **enabled**.")] });
    }

    if (sub === "disable") {
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: false });
      return ctx.reply({ embeds: [successEmbed("antinuke has been **disabled**.")] });
    }

    // ── log channel ──────────────────────────────────────────────────────────
    if (sub === "log") {
      if (!arg1 || arg1 === "remove" || arg1 === "off") {
        await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: null });
        return ctx.reply({ embeds: [successEmbed("antinuke log channel **removed**.")] });
      }
      const ch = ctx.getChannel?.("channel") ?? ctx.guild.channels.cache.get(arg1.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("channel not found.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`antinuke logs will be sent to <#${ch.id}>.`)] });
    }

    // ── whitelist ────────────────────────────────────────────────────────────
    if (sub === "whitelist") {
      if (!arg1 || arg1 === "list") {
        const rows = await db.select().from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no users are whitelisted.")] });
        return ctx.reply({
          embeds: [brandEmbed({
            title: "antinuke whitelist",
            description: rows.map((r, i) => `${i + 1}. <@${r.userId}> (\`${r.userId}\`)`).join("\n"),
          })],
        });
      }
      if (arg1 === "clear") {
        if (!isOwner) return ctx.reply({ embeds: [errorEmbed("only the server **owner** can clear the whitelist.")] });
        await db.delete(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
        invalidateWhitelistCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed("antinuke whitelist **cleared**.")] });
      }
      if (arg1 === "remove") {
        const rawId = args[2] ?? ctx.getString?.("arg2") ?? "";
        const user  = await resolveUser(ctx, rawId);
        if (!user) return ctx.reply({ embeds: [errorEmbed("user not found. provide a mention or user ID.")] });
        const exists = await db.select().from(antinukeWhitelist).where(
          and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id))
        );
        if (!exists.length) return ctx.reply({ embeds: [errorEmbed(`<@${user.id}> is not whitelisted.`)] });
        await db.delete(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
        invalidateWhitelistCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`<@${user.id}> has been removed from the whitelist.`)], allowedMentions: { parse: [] } });
      }
      // ,antinuke whitelist @user  (or ,antinuke whitelist add @user)
      const rawId = arg1 === "add"
        ? (args[2] ?? ctx.getString?.("arg2") ?? "")
        : (args[1] ?? ctx.getString?.("arg1") ?? "");
      const user = await resolveUser(ctx, rawId);
      if (!user) return ctx.reply({ embeds: [errorEmbed("user not found. provide a mention or user ID.")] });
      const exists = await db.select().from(antinukeWhitelist).where(
        and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id))
      );
      if (exists.length) return ctx.reply({ embeds: [errorEmbed(`<@${user.id}> is already whitelisted.`)] });
      await db.insert(antinukeWhitelist).values({ guildId: ctx.guild.id, userId: user.id }).onConflictDoNothing();
      invalidateWhitelistCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`<@${user.id}> has been added to the antinuke whitelist.`)], allowedMentions: { parse: [] } });
    }

    // ── admin ────────────────────────────────────────────────────────────────
    if (sub === "admin") {
      if (!isOwner) return ctx.reply({ embeds: [errorEmbed("only the server **owner** can manage antinuke admins.")] });
      if (!arg1 || arg1 === "list") {
        const rows = await db.select().from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no antinuke admins set.")] });
        return ctx.reply({
          embeds: [brandEmbed({
            title: "antinuke admins",
            description: rows.map((r, i) => `${i + 1}. <@${r.userId}> (\`${r.userId}\`)`).join("\n"),
          })],
        });
      }
      if (arg1 === "remove") {
        const rawId = args[2] ?? ctx.getString?.("arg2") ?? "";
        const user  = await resolveUser(ctx, rawId);
        if (!user) return ctx.reply({ embeds: [errorEmbed("user not found. provide a mention or user ID.")] });
        if (user.id === ctx.guild.ownerId) return ctx.reply({ embeds: [errorEmbed("the server owner is always an antinuke admin.")] });
        const exists = await db.select().from(antinukeAdmins).where(
          and(eq(antinukeAdmins.guildId, ctx.guild.id), eq(antinukeAdmins.userId, user.id))
        );
        if (!exists.length) return ctx.reply({ embeds: [errorEmbed(`<@${user.id}> is not an antinuke admin.`)] });
        await db.delete(antinukeAdmins).where(and(eq(antinukeAdmins.guildId, ctx.guild.id), eq(antinukeAdmins.userId, user.id)));
        invalidateAdminCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`<@${user.id}> is no longer an antinuke admin.`)], allowedMentions: { parse: [] } });
      }
      // ,antinuke admin @user  (or ,antinuke admin add @user)
      const rawId = arg1 === "add"
        ? (args[2] ?? ctx.getString?.("arg2") ?? "")
        : (args[1] ?? ctx.getString?.("arg1") ?? "");
      const user = await resolveUser(ctx, rawId);
      if (!user) return ctx.reply({ embeds: [errorEmbed("user not found. provide a mention or user ID.")] });
      if (user.id === ctx.guild.ownerId) return ctx.reply({ embeds: [errorEmbed("the server owner is always an antinuke admin.")] });
      const exists = await db.select().from(antinukeAdmins).where(
        and(eq(antinukeAdmins.guildId, ctx.guild.id), eq(antinukeAdmins.userId, user.id))
      );
      if (exists.length) return ctx.reply({ embeds: [errorEmbed(`<@${user.id}> is already an antinuke admin.`)] });
      await db.insert(antinukeAdmins).values({ guildId: ctx.guild.id, userId: user.id }).onConflictDoNothing();
      invalidateAdminCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`<@${user.id}> can now manage antinuke settings.`)], allowedMentions: { parse: [] } });
    }

    if (sub === "permissions" && ["watch", "unwatch", "list"].includes(arg1)) {
      if (arg1 === "list") {
        const rows = await listAntinukePermissionWatches(ctx.guild.id);
        const lines = rows.map((r) => r.direction + " — " + r.permission);
        return ctx.reply({ embeds: [brandEmbed({ title: "antinuke — permission watches", description: lines.length ? lines.join("; ") : "no permission changes are being watched." })] });
      }
      const direction = arg2;
      const permission = arg3.replace(/-/g, "_");
      if (direction !== "granted" && direction !== "removed") return ctx.reply({ embeds: [errorEmbed("usage: antinuke permissions watch|unwatch granted|removed permission")] });
      if (!Object.hasOwn(ANTINUKE_WATCH_PERMISSIONS, permission)) return ctx.reply({ embeds: [errorEmbed("invalid permission. supported: administrator, ban_members, mention_everyone, kick_members, moderate_members, manage_guild, manage_channels, manage_roles, view_audit_log, manage_webhooks, manage_expressions, manage_nicknames.")] });
      const where = and(eq(antinukePermissionWatches.guildId, ctx.guild.id), eq(antinukePermissionWatches.direction, direction), eq(antinukePermissionWatches.permission, permission));
      if (arg1 === "watch") {
        await db.insert(antinukePermissionWatches).values({ guildId: ctx.guild.id, direction, permission }).onConflictDoNothing();
        await updateGuildSettings(ctx.guild.id, { antinukeEnabled: true });
        return ctx.reply({ embeds: [successEmbed("watching when " + permission + " is " + direction + " on a role. Changes will be reverted.")] });
      }
      const deleted = await db.delete(antinukePermissionWatches).where(where).returning();
      return ctx.reply({ embeds: [deleted.length ? successEmbed("stopped watching " + permission + " being " + direction + ".") : errorEmbed("that permission watch was not configured.")] });
    }
    // ── dangerous permission protection ──────────────────────────────────────
    if (sub === "permissions") {
      const modules = await getModuleConfigs(ctx.guild.id);
      const cfg = modules.get("permissions");

      if (!arg1) {
        return ctx.reply({ embeds: [brandEmbed({
          title: "antinuke — permissions",
          description: [
            `**status** — ${cfg?.enabled ? "**enabled**" : "**disabled**"}`,
            `**punishment** — \`${cfg?.punishment ?? settings.antinukeAction ?? "ban"}\``,
            "",
            "This module watches dangerous permissions being granted through role updates.",
          ].join("\\n"),
        })] });
      }

      if (arg1 !== "on" && arg1 !== "off") {
        return ctx.reply({ embeds: [errorEmbed("usage: `antinuke permissions on|off`")] });
      }

      const enabled = arg1 === "on";
      await db
        .insert(antinukeModules)
        .values({
          guildId: ctx.guild.id,
          module: "permissions",
          enabled,
          threshold: cfg?.threshold ?? 1,
          punishment: cfg?.punishment ?? settings.antinukeAction ?? "ban",
          countCommands: false,
        })
        .onConflictDoUpdate({
          target: [antinukeModules.guildId, antinukeModules.module],
          set: { enabled },
        });
      invalidateModuleCache(ctx.guild.id);
      if (enabled) await updateGuildSettings(ctx.guild.id, { antinukeEnabled: true });

      return ctx.reply({ embeds: [successEmbed(`antinuke permission protection is now **${arg1}**.`)] });
    }

    // ── module subcommands ───────────────────────────────────────────────────
    if ((MODULES as readonly string[]).includes(sub)) {
      const module  = sub as Module;
      const modules = await getModuleConfigs(ctx.guild.id);
      const cfg     = modules.get(module);

      // No arg → show current config
      if (!arg1) {
        const status = cfg?.enabled ? "**enabled**" : "**disabled**";
        const lines  = [
          `**status** — ${status}`,
          ...(HAS_THRESHOLD.has(module) ? [`**threshold** — \`${cfg?.threshold ?? 3}\``] : []),
          `**punishment** — \`${cfg?.punishment ?? "ban"}\``,
          ...(HAS_COMMAND.has(module)   ? [`**command detection** — ${cfg?.countCommands ? "on" : "off"}`] : []),
        ];
        return ctx.reply({ embeds: [brandEmbed({ title: `antinuke — ${MODULE_LABELS[module]}`, description: lines.join("\n") })] });
      }

      // ── on / off (with optional inline flags) ────────────────────────────
      if (arg1 === "on" || arg1 === "off") {
        const enabled = arg1 === "on";
        // flags start at args[2] (everything after "ban on")
        const flags = parseFlags(args.slice(2));
        const slashThreshold = ctx.source === "slash" ? ctx.getNumber("threshold") : null;
        const slashCommandDetection = ctx.source === "slash" ? ctx.getBoolean("command_detection") : null;

        const newThreshold    = slashThreshold ?? flags.threshold ?? cfg?.threshold ?? 3;
        const newPunishment   = (ctx.source === "slash" ? (ctx.getString("punishment") ?? undefined) : undefined) ?? flags.do ?? cfg?.punishment ?? "ban";
        const newCountCmds    = slashCommandDetection ?? (flags.command !== undefined ? flags.command : (cfg?.countCommands ?? false));

        await db
          .insert(antinukeModules)
          .values({ guildId: ctx.guild.id, module, enabled, threshold: newThreshold, punishment: newPunishment, countCommands: newCountCmds })
          .onConflictDoUpdate({
            target: [antinukeModules.guildId, antinukeModules.module],
            set: { enabled, threshold: newThreshold, punishment: newPunishment, countCommands: newCountCmds },
          });
        invalidateModuleCache(ctx.guild.id);
        if (enabled) await updateGuildSettings(ctx.guild.id, { antinukeEnabled: true });

        const lines = [
          `**${MODULE_LABELS[module]}** protection is now **${arg1}**`,
          ...(HAS_THRESHOLD.has(module) ? [`**threshold** — \`${newThreshold}\``] : []),
          `**punishment** — \`${newPunishment}\``,
          ...(HAS_COMMAND.has(module)   ? [`**command detection** — ${newCountCmds ? "on" : "off"}`] : []),
        ];
        return ctx.reply({ embeds: [successEmbed(lines.join("\n"))] });
      }

      // ── standalone threshold subcommand (backwards compat) ───────────────
      if (arg1 === "threshold") {
        if (!HAS_THRESHOLD.has(module)) {
          return ctx.reply({ embeds: [errorEmbed(`the **${MODULE_LABELS[module]}** module has no threshold.`)] });
        }
        const n = parseInt(arg2);
        if (isNaN(n) || n < 1) return ctx.reply({ embeds: [errorEmbed("threshold must be **1 or higher**.")] });
        await db
          .insert(antinukeModules)
          .values({ guildId: ctx.guild.id, module, enabled: cfg?.enabled ?? false, threshold: n, punishment: cfg?.punishment ?? "ban", countCommands: cfg?.countCommands ?? false })
          .onConflictDoUpdate({ target: [antinukeModules.guildId, antinukeModules.module], set: { threshold: n } });
        invalidateModuleCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`**${MODULE_LABELS[module]}** threshold set to **${n}**.`)] });
      }

      // ── standalone punishment subcommand (backwards compat) ─────────────
      if (arg1 === "punishment" || arg1 === "do") {
        if (!["ban", "kick", "timeout", "strip", "stripstaff", "jail"].includes(arg2)) {
          return ctx.reply({ embeds: [errorEmbed("punishment must be `ban`, `kick`, `timeout`, `strip`, `stripstaff`, or `jail`.")] });
        }
        await db
          .insert(antinukeModules)
          .values({ guildId: ctx.guild.id, module, enabled: cfg?.enabled ?? false, threshold: cfg?.threshold ?? 3, punishment: arg2, countCommands: cfg?.countCommands ?? false })
          .onConflictDoUpdate({ target: [antinukeModules.guildId, antinukeModules.module], set: { punishment: arg2 } });
        invalidateModuleCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`**${MODULE_LABELS[module]}** punishment set to **${arg2}**.`)] });
      }

      // ── standalone command-detection subcommand ──────────────────────────
      if (arg1 === "command" || arg1 === "--command") {
        if (!HAS_COMMAND.has(module)) {
          return ctx.reply({ embeds: [errorEmbed(`the **${MODULE_LABELS[module]}** module doesn't support command detection.`)] });
        }
        const on = ["on", "true", "yes", "1"].includes(arg2);
        await db
          .insert(antinukeModules)
          .values({ guildId: ctx.guild.id, module, enabled: cfg?.enabled ?? false, threshold: cfg?.threshold ?? 3, punishment: cfg?.punishment ?? "ban", countCommands: on })
          .onConflictDoUpdate({ target: [antinukeModules.guildId, antinukeModules.module], set: { countCommands: on } });
        invalidateModuleCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`**${MODULE_LABELS[module]}** command detection is now **${on ? "on" : "off"}**.`)] });
      }

      return ctx.reply({ embeds: [errorEmbed(`usage: \`antinuke ${module} on|off [--threshold <n>] [--do ban|kick|timeout|strip|stripstaff|jail] [--command on|off]\``)] });
    }

    // ── overview ─────────────────────────────────────────────────────────────
    const modules  = await getModuleConfigs(ctx.guild.id);
    const wlCount  = (await db.select().from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id))).length;
    const admCount = (await db.select().from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id))).length;

    const moduleLines = (MODULES as readonly string[]).map(m => {
      const mod   = modules.get(m);
      const on    = mod?.enabled ? "✅" : "❌";
      const lbl   = MODULE_LABELS[m as Module];
      const parts: string[] = [];
      if (HAS_THRESHOLD.has(m as Module)) parts.push(`threshold \`${mod?.threshold ?? 3}\``);
      parts.push(`do \`${mod?.punishment ?? "ban"}\``);
      if (HAS_COMMAND.has(m as Module)) parts.push(`cmd \`${mod?.countCommands ? "on" : "off"}\``);
      return `${on} **${lbl}** — ${parts.join(" | ")}`;
    }).join("\n");

    return ctx.reply({
      embeds: [brandEmbed({
        authorName: ctx.user.globalName ?? ctx.user.username,
        authorIcon: ctx.user.displayAvatarURL({ size: 64 }),
        title: "antinuke",
        description: [
          `antinuke is **${settings.antinukeEnabled ? "enabled" : "disabled"}**`,
          `log channel: ${settings.antinukeLogChannel ? `<#${settings.antinukeLogChannel}>` : "not set"}`,
          `admins: **${admCount}** · whitelisted: **${wlCount}**`,
          "",
          moduleLines,
          "",
          `use \`antinuke enable\` or \`antinuke disable\` to toggle`,
          `use \`antinuke <module> on/off [--threshold N] [--do punishment] [--command on/off]\` to configure`,
        ].join("\n"),
      })],
    });
  },
};
