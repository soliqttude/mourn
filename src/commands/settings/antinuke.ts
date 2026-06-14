import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { antinukeWhitelist, antinukeAdmins, antinukeModules } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import {
  invalidateWhitelistCache,
  invalidateAdminCache,
  invalidateModuleCache,
  isAntinukeAdmin,
  getModuleConfigs,
} from "../../features/antinuke.js";

const MODULES = ["ban", "kick", "channel", "role", "emoji", "webhook", "botadd", "vanity"] as const;
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
      if (!isNaN(n) && n >= 1 && n <= 20) out.threshold = n;
      i++;
    } else if ((a === "--do" || a === "-do") && next) {
      const p = next.toLowerCase();
      if (["ban", "kick", "strip"].includes(p)) out.do = p;
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
  description: "Configure anti-nuke protection for your server.",
  usage: "antinuke [module|whitelist|admin|log|enable|disable]",
  examples: [
    "antinuke",
    "antinuke enable",
    "antinuke disable",
    "antinuke ban on",
    "antinuke ban on --threshold 3 --do ban --command on",
    "antinuke ban off",
    "antinuke ban threshold 3",
    "antinuke ban punishment ban",
    "antinuke whitelist @user",
    "antinuke whitelist remove @user",
    "antinuke whitelist list",
    "antinuke admin @user",
    "antinuke admin remove @user",
    "antinuke admin list",
    "antinuke log #channel",
    "antinuke log remove",
  ],
  category: "settings",
  permission: "administrator",
  guildOnly: true,
  options: [
    { name: "sub",   description: "subcommand", type: ApplicationCommandOptionType.String, required: false },
    { name: "arg1",  description: "argument 1", type: ApplicationCommandOptionType.String, required: false },
    { name: "arg2",  description: "argument 2", type: ApplicationCommandOptionType.String, required: false },
    { name: "user",  description: "user",        type: ApplicationCommandOptionType.User,   required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const args = ctx.args;
    const sub  = (ctx.getString?.("sub")  ?? args[0] ?? "").toLowerCase();
    const arg1 = (ctx.getString?.("arg1") ?? args[1] ?? "").toLowerCase();
    const arg2 = (ctx.getString?.("arg2") ?? args[2] ?? "").toLowerCase();

    const settings = await getGuildSettings(ctx.guild.id);
    const isOwner  = ctx.user.id === ctx.guild.ownerId;
    const isAdmin  = await isAntinukeAdmin(ctx.guild.id, ctx.user.id, ctx.guild.ownerId);

    if (!isAdmin) {
      return ctx.reply({ embeds: [errorEmbed("you must be the server **owner** or an **antinuke admin**.")] });
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

        const newThreshold    = flags.threshold                 ?? cfg?.threshold     ?? 3;
        const newPunishment   = flags.do                        ?? cfg?.punishment    ?? "ban";
        const newCountCmds    = flags.command !== undefined      ? flags.command       : (cfg?.countCommands ?? false);

        await db
          .insert(antinukeModules)
          .values({ guildId: ctx.guild.id, module, enabled, threshold: newThreshold, punishment: newPunishment, countCommands: newCountCmds })
          .onConflictDoUpdate({
            target: [antinukeModules.guildId, antinukeModules.module],
            set: { enabled, threshold: newThreshold, punishment: newPunishment, countCommands: newCountCmds },
          });
        invalidateModuleCache(ctx.guild.id);

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
        if (isNaN(n) || n < 1 || n > 20) return ctx.reply({ embeds: [errorEmbed("threshold must be between **1** and **20**.")] });
        await db
          .insert(antinukeModules)
          .values({ guildId: ctx.guild.id, module, enabled: cfg?.enabled ?? false, threshold: n, punishment: cfg?.punishment ?? "ban", countCommands: cfg?.countCommands ?? false })
          .onConflictDoUpdate({ target: [antinukeModules.guildId, antinukeModules.module], set: { threshold: n } });
        invalidateModuleCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`**${MODULE_LABELS[module]}** threshold set to **${n}**.`)] });
      }

      // ── standalone punishment subcommand (backwards compat) ─────────────
      if (arg1 === "punishment" || arg1 === "do") {
        if (!["ban", "kick", "strip"].includes(arg2)) {
          return ctx.reply({ embeds: [errorEmbed("punishment must be `ban`, `kick`, or `strip`.")] });
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

      return ctx.reply({ embeds: [errorEmbed(`usage: \`antinuke ${module} on|off [--threshold <n>] [--do ban|kick|strip] [--command on|off]\``)] });
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
