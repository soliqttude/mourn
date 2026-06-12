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

const MODULES = ["ban", "kick", "role", "channel", "emoji", "webhook", "botadd", "vanity"] as const;
type Module = typeof MODULES[number];

const MODULE_LABELS: Record<Module, string> = {
  ban:     "Mass Member Ban",
  kick:    "Mass Member Kick",
  role:    "Role Deletion",
  channel: "Channel Creation/Deletion",
  emoji:   "Emoji Deletion",
  webhook: "Webhook Creation",
  botadd:  "Deny Bot Joins",
  vanity:  "Vanity Protection",
};

function parseFlags(args: string[]): { threshold?: number; punishment?: string; command?: boolean } {
  const flags: { threshold?: number; punishment?: string; command?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--threshold" && args[i + 1]) {
      const n = parseInt(args[++i]);
      if (!isNaN(n)) flags.threshold = Math.max(1, Math.min(10, n));
    } else if (args[i] === "--do" && args[i + 1]) {
      flags.punishment = args[++i].toLowerCase();
    } else if (args[i] === "--command" && args[i + 1]) {
      flags.command = args[++i].toLowerCase() === "on";
    }
  }
  return flags;
}

export const command: HybridCommand = {
  name: "antinuke",
  description: "Configure anti-nuke protection.",
  usage: "antinuke [module on|off] [--threshold N] [--do ban|kick|strip] [--command on|off]",
  examples: [
    "antinuke ban on --threshold 3 --do ban --command on",
    "antinuke kick on --threshold 2 --do kick --command on",
    "antinuke role on --threshold 3",
    "antinuke channel on --threshold 3",
    "antinuke emoji on",
    "antinuke webhook on",
    "antinuke botadd on",
    "antinuke vanity on",
    "antinuke config",
    "antinuke list",
    "antinuke admins",
    "antinuke admin @user",
    "antinuke whitelist @user",
  ],
  category: "settings",
  permission: "owner",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "ban|kick|role|channel|emoji|webhook|botadd|vanity|config|list|admins|admin|whitelist", type: ApplicationCommandOptionType.String, required: false },
    { name: "value",      description: "on|off|@user|add|remove|list",                                                        type: ApplicationCommandOptionType.String, required: false },
    { name: "user",       description: "For admin/whitelist subcommands",                                                      type: ApplicationCommandOptionType.User,   required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const args    = ctx.args;
    const sub     = (ctx.getString("subcommand") ?? args[0] ?? "").toLowerCase();
    const val     = (ctx.getString("value")      ?? args[1] ?? "").toLowerCase();
    const settings = await getGuildSettings(ctx.guild.id);

    const isAdmin = ctx.member
      ? await isAntinukeAdmin(ctx.guild.id, ctx.user.id, ctx.guild.ownerId)
      : ctx.user.id === ctx.guild.ownerId;

    // owner-only gates
    if ((sub === "admin") && ctx.user.id !== ctx.guild.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("Only the server **owner** can manage antinuke admins.")] });
    }
    if (sub && !isAdmin) {
      return ctx.reply({ embeds: [errorEmbed("You must be the server **owner** or an **antinuke admin**.")] });
    }

    // ── Global toggle (no subcommand) ─────────────────────────────────────────
    if (!sub) {
      if (!isAdmin) return ctx.reply({ embeds: [errorEmbed("You must be the server **owner** or an **antinuke admin**.")] });
      const enabled = !settings.antinukeEnabled;
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: enabled });
      return ctx.reply({ embeds: [successEmbed(`${ctx.user.username}: antinuke is now **${enabled ? "enabled" : "disabled"}**.`)] });
    }

    // ── Per-module subcommands ─────────────────────────────────────────────────
    if ((MODULES as readonly string[]).includes(sub)) {
      const module = sub as Module;
      const enabled = val === "on";
      const disabled = val === "off";
      if (!enabled && !disabled) {
        return ctx.reply({ embeds: [errorEmbed(`use \`antinuke ${module} on\` or \`antinuke ${module} off\`.`)] });
      }

      const flags = parseFlags(args.slice(2));

      if (flags.punishment && !["ban", "kick", "strip"].includes(flags.punishment)) {
        return ctx.reply({ embeds: [errorEmbed("valid punishments: `ban`, `kick`, `strip`.")] });
      }

      // Upsert the module row
      await db
        .insert(antinukeModules)
        .values({
          guildId:       ctx.guild.id,
          module,
          enabled,
          threshold:     flags.threshold ?? 3,
          punishment:    flags.punishment ?? "ban",
          countCommands: flags.command ?? false,
        })
        .onConflictDoUpdate({
          target: [antinukeModules.guildId, antinukeModules.module],
          set: {
            enabled,
            ...(flags.threshold  !== undefined && { threshold:     flags.threshold }),
            ...(flags.punishment !== undefined && { punishment:    flags.punishment }),
            ...(flags.command    !== undefined && { countCommands: flags.command }),
          },
        });

      invalidateModuleCache(ctx.guild.id);

      const verb = enabled ? "Enabled" : "Disabled";
      return ctx.reply({ embeds: [successEmbed(`${ctx.user.username}: ${verb} **${module}** antinuke module`)] });
    }

    // ── Config ────────────────────────────────────────────────────────────────
    if (sub === "config") {
      const modules    = await getModuleConfigs(ctx.guild.id);
      const wlRows     = await db.select().from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
      const adminRows  = await db.select().from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id));

      const bots    = wlRows.filter(r => ctx.guild!.members.cache.get(r.userId)?.user.bot ?? false);
      const members = wlRows.filter(r => !ctx.guild!.members.cache.get(r.userId)?.user.bot);
      const enabledCount = [...modules.values()].filter(m => m.enabled).length;

      const moduleLines = (Object.entries(MODULE_LABELS) as [Module, string][])
        .map(([k, label]) => `**${label}:** ${modules.get(k)?.enabled ? "✅" : "❌"}`)
        .join("\n");

      const generalLines = [
        `**Super Admins:** ${adminRows.length}`,
        `**Whitelisted Bots:** ${bots.length}`,
        `**Whitelisted Members:** ${members.length}`,
        `**Protection Modules:** ${enabledCount} enabled`,
        `**Deny Bot Joins (botadd):** ${modules.get("botadd")?.enabled ? "✅" : "❌"}`,
      ].join("\n");

      return ctx.reply({
        embeds: [brandEmbed({
          authorName: ctx.user.globalName ?? ctx.user.username,
          authorIcon: ctx.user.displayAvatarURL({ size: 64 }),
          title: "Settings",
          description: `Antinuke is **${settings.antinukeEnabled ? "enabled" : "disabled"}** in this server`,
          fields: [
            { name: "Modules",  value: moduleLines,  inline: true },
            { name: "General",  value: generalLines, inline: true },
          ],
        })],
      });
    }

    // ── List ──────────────────────────────────────────────────────────────────
    if (sub === "list") {
      const modules = await getModuleConfigs(ctx.guild.id);
      const wlRows  = await db.select().from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));

      const enabledModules = (MODULES as readonly string[])
        .filter(m => modules.get(m)?.enabled)
        .map(m => {
          const cfg = modules.get(m)!;
          const parts = [`do: ${cfg.punishment}`, `threshold: ${(m === "botadd" || m === "vanity") ? "N/A" : cfg.threshold}`];
          if (cfg.countCommands) parts.push("cmd: on");
          return `**${m}** (${parts.join(", ")})`;
        });

      const wlLines = wlRows.map(r => {
        const member = ctx.guild!.members.cache.get(r.userId);
        const tag    = member ? (member.user.bot ? `${member.user.username}` : `${member.user.username}`) : `\`${r.userId}\``;
        const type   = member?.user.bot ? "[BOT]" : "[MEMBER]";
        return `${tag} whitelisted (\`${r.userId}\`) ${type}`;
      });

      const lines = [...enabledModules, ...wlLines];
      if (!lines.length) return ctx.reply({ embeds: [errorEmbed("No antinuke modules enabled and no whitelisted users.")] });

      const numbered = lines.map((l, i) => `${i + 1} ${l}`).join("\n");
      return ctx.reply({
        embeds: [brandEmbed({
          title: "Antinuke modules & whitelist",
          description: numbered.slice(0, 4096),
        })],
      });
    }

    // ── Admins list ───────────────────────────────────────────────────────────
    if (sub === "admins") {
      const rows = await db.select({ userId: antinukeAdmins.userId }).from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No antinuke **admins** set.")] });
      return ctx.reply({
        embeds: [brandEmbed({
          title: "Antinuke admins",
          description: rows.map((r, i) => `${i + 1}. <@${r.userId}>`).join("\n"),
        })],
      });
    }

    // ── Admin toggle (owner only) ─────────────────────────────────────────────
    if (sub === "admin") {
      const user = await ctx.getUser("user").catch(() => null)
        ?? (val ? await ctx.guild.client.users.fetch(val.replace(/[<@!>]/g, "")).catch(() => null) : null);

      if (!user) {
        // show list if no user
        const rows = await db.select({ userId: antinukeAdmins.userId }).from(antinukeAdmins).where(eq(antinukeAdmins.guildId, ctx.guild.id));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No antinuke admins set.")] });
        return ctx.reply({
          embeds: [brandEmbed({
            title: "Antinuke admins",
            description: rows.map((r, i) => `${i + 1}. <@${r.userId}>`).join("\n"),
          })],
        });
      }

      const exists = await db.select().from(antinukeAdmins).where(and(eq(antinukeAdmins.guildId, ctx.guild.id), eq(antinukeAdmins.userId, user.id)));
      if (exists.length) {
        await db.delete(antinukeAdmins).where(and(eq(antinukeAdmins.guildId, ctx.guild.id), eq(antinukeAdmins.userId, user.id)));
        invalidateAdminCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`removed <@${user.id}> from antinuke admins.`)] });
      }
      await db.insert(antinukeAdmins).values({ guildId: ctx.guild.id, userId: user.id }).onConflictDoNothing();
      invalidateAdminCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`<@${user.id}> can now manage antinuke settings.`)] });
    }

    // ── Whitelist toggle ──────────────────────────────────────────────────────
    if (sub === "whitelist") {
      const user = await ctx.getUser("user").catch(() => null)
        ?? (val ? await ctx.guild.client.users.fetch(val.replace(/[<@!>]/g, "")).catch(() => null) : null);

      if (!user) {
        const rows = await db.select({ userId: antinukeWhitelist.userId }).from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
        const list = rows.length ? rows.map((r, i) => `${i + 1}. <@${r.userId}>`).join("\n") : "*no whitelisted users.*";
        return ctx.reply({ embeds: [brandEmbed({ title: "antinuke whitelist", description: list })] });
      }

      const exists = await db.select().from(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
      if (exists.length) {
        await db.delete(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
        invalidateWhitelistCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`removed <@${user.id}> from the antinuke whitelist.`)] });
      }
      await db.insert(antinukeWhitelist).values({ guildId: ctx.guild.id, userId: user.id }).onConflictDoNothing();
      invalidateWhitelistCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`<@${user.id}> is now whitelisted from antinuke.`)] });
    }

    // ── Help ──────────────────────────────────────────────────────────────────
    return ctx.reply({
      embeds: [brandEmbed({
        title: "antinuke",
        description: [
          "`,antinuke` — toggle on/off",
          "`,antinuke <ban|kick|role|channel|emoji|webhook|botadd|vanity> on|off`",
          "  flags: `--threshold N` · `--do ban|kick|strip` · `--command on|off`",
          "`,antinuke config` — view full config",
          "`,antinuke list` — enabled modules & whitelist",
          "`,antinuke admins` — list antinuke admins",
          "`,antinuke admin @user` — toggle admin (owner only)",
          "`,antinuke whitelist @user` — toggle whitelist",
        ].join("\n"),
      })],
    });
  },
};
