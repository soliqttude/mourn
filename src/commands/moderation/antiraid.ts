import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { antinukeWhitelist } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { invalidateWhitelistCache } from "../../features/antinuke.js";

async function resolveUser(ctx: any, raw: string) {
  try { const u = await ctx.getUser("user"); if (u) return u; } catch {}
  const id = raw?.replace(/[<@!>]/g, "");
  if (id && /^\d+$/.test(id)) return ctx.guild!.client.users.fetch(id).catch(() => null);
  return null;
}

export const command: HybridCommand = {
  name: "antiraid",
  aliases: ["raid"],
  description: "Configure anti-raid protection for your server.",
  usage: "antiraid [enable|disable|threshold|punishment|age|avatar|log|lock|whitelist]",
  examples: [
    "antiraid",
    "antiraid enable",
    "antiraid disable",
    "antiraid threshold 8",
    "antiraid punishment kick",
    "antiraid age 7",
    "antiraid avatar on",
    "antiraid log #channel",
    "antiraid log remove",
    "antiraid lock on",
    "antiraid whitelist add @user",
    "antiraid whitelist remove @user",
    "antiraid whitelist list",
  ],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  userPermissions: ["Administrator"],
  options: [
    { name: "sub",  description: "subcommand", type: ApplicationCommandOptionType.String, required: false },
    { name: "arg1", description: "argument",   type: ApplicationCommandOptionType.String, required: false },
    { name: "arg2", description: "argument 2", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "user",        type: ApplicationCommandOptionType.User,   required: false },
    { name: "channel", description: "log channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const args = ctx.args;
    const sub  = (ctx.getString("sub")  ?? args[0] ?? "").toLowerCase();
    const arg1 = (ctx.getString("arg1") ?? args[1] ?? "").toLowerCase();
    const arg2 = (ctx.getString("arg2") ?? args[2] ?? "").toLowerCase();

    const settings = await getGuildSettings(ctx.guild.id);

    // ── enable / disable ───────────────────────────────────────────────────────
    if (sub === "enable") {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: true });
      return ctx.reply({ embeds: [successEmbed("antiraid protection has been **enabled**.")] });
    }

    if (sub === "disable") {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: false });
      return ctx.reply({ embeds: [successEmbed("antiraid protection has been **disabled**.")] });
    }

    // ── threshold ──────────────────────────────────────────────────────────────
    if (sub === "threshold") {
      const n = parseInt(arg1);
      if (isNaN(n) || n < 2 || n > 50) {
        return ctx.reply({ embeds: [errorEmbed("threshold must be between **2** and **50** joins per 10 seconds.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidThreshold: n });
      return ctx.reply({ embeds: [successEmbed(`antiraid will trigger when **${n}** members join within **10 seconds**.`)] });
    }

    // ── punishment ─────────────────────────────────────────────────────────────
    if (sub === "punishment" || sub === "action") {
      if (!["kick", "ban"].includes(arg1)) {
        return ctx.reply({ embeds: [errorEmbed("punishment must be `kick` or `ban`.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidAction: arg1 });
      return ctx.reply({ embeds: [successEmbed(`antiraid punishment set to **${arg1}**.`)] });
    }

    // ── account age gate ───────────────────────────────────────────────────────
    if (sub === "age") {
      const n = parseInt(arg1);
      if (isNaN(n) || n < 0 || n > 365) {
        return ctx.reply({ embeds: [errorEmbed("age must be between **0** (disabled) and **365** days.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidJoinAge: n });
      return ctx.reply({
        embeds: [successEmbed(n === 0
          ? "account age gate has been **disabled**."
          : `accounts younger than **${n} days** will be ${settings.antiraidAction ?? "kicked"} on join.`)],
      });
    }

    // ── avatar requirement ─────────────────────────────────────────────────────
    if (sub === "avatar") {
      if (!arg1 || !["on", "off"].includes(arg1)) {
        return ctx.reply({ embeds: [errorEmbed("usage: `antiraid avatar on|off`")] });
      }
      const on = arg1 === "on";
      await updateGuildSettings(ctx.guild.id, { antiraidRequireAvatar: on } as any);
      return ctx.reply({
        embeds: [successEmbed(`avatar requirement **${on ? "enabled" : "disabled"}** — members without an avatar will be ${on ? (settings.antiraidAction ?? "kicked") : "allowed"} on join.`)],
      });
    }

    // ── log channel ────────────────────────────────────────────────────────────
    if (sub === "log") {
      if (!arg1 || arg1 === "remove" || arg1 === "off") {
        await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: null });
        return ctx.reply({ embeds: [successEmbed("antiraid log channel **removed**.")] });
      }
      const ch = ctx.getChannel?.("channel") ?? ctx.guild.channels.cache.get(arg1.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("channel not found.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`antiraid alerts will be sent to <#${ch.id}>.`)] });
    }

    // ── server lockdown on raid ────────────────────────────────────────────────
    if (sub === "lock") {
      if (!arg1 || !["on", "off"].includes(arg1)) {
        return ctx.reply({ embeds: [errorEmbed("usage: `antiraid lock on|off`")] });
      }
      const on = arg1 === "on";
      await updateGuildSettings(ctx.guild.id, { antiraidLockOnRaid: on });
      return ctx.reply({ embeds: [successEmbed(`server lockdown on raid **${on ? "enabled" : "disabled"}** — channels will ${on ? "be locked when a raid is detected" : "not be locked"}.`)] });
    }

    // ── raid mode (manual) ─────────────────────────────────────────────────────
    if (sub === "mode" || sub === "state") {
      if (!arg1 || !["on", "off"].includes(arg1)) {
        return ctx.reply({ embeds: [errorEmbed("usage: `antiraid mode on|off`")] });
      }
      const on = arg1 === "on";
      await updateGuildSettings(ctx.guild.id, { antiraidManualState: on } as any);
      return ctx.reply({
        embeds: [successEmbed(on
          ? "🔴 **raid mode manually activated** — all incoming joins will be actioned."
          : "✅ **raid mode deactivated** — server is back to normal.")],
      });
    }

    // ── whitelist (shared with antinuke) ───────────────────────────────────────
    if (sub === "whitelist") {
      if (!arg1 || arg1 === "list") {
        const rows = await db.select().from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no users are whitelisted.")] });
        return ctx.reply({
          embeds: [brandEmbed({
            title: "security whitelist",
            description: rows.map((r, i) => `${i + 1}. <@${r.userId}> (\`${r.userId}\`)`).join("\n"),
          })],
        });
      }

      if (arg1 === "add" || arg1 === "remove") {
        const rawId = args[2] ?? ctx.getString("arg2") ?? "";
        const user  = await resolveUser(ctx, rawId);
        if (!user) return ctx.reply({ embeds: [errorEmbed("user not found.")] });

        const exists = await db.select().from(antinukeWhitelist).where(
          and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id))
        );

        if (arg1 === "add") {
          if (exists.length) return ctx.reply({ embeds: [errorEmbed(`<@${user.id}> is already whitelisted.`)] });
          await db.insert(antinukeWhitelist).values({ guildId: ctx.guild.id, userId: user.id }).onConflictDoNothing();
          invalidateWhitelistCache(ctx.guild.id);
          return ctx.reply({ embeds: [successEmbed(`<@${user.id}> is now whitelisted from all security checks.`)], allowedMentions: { parse: [] } });
        } else {
          if (!exists.length) return ctx.reply({ embeds: [errorEmbed(`<@${user.id}> is not whitelisted.`)] });
          await db.delete(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
          invalidateWhitelistCache(ctx.guild.id);
          return ctx.reply({ embeds: [successEmbed(`<@${user.id}> has been removed from the security whitelist.`)], allowedMentions: { parse: [] } });
        }
      }

      return ctx.reply({ embeds: [errorEmbed("usage: `antiraid whitelist add/remove/list @user`")] });
    }

    // ── status (no subcommand or explicit status) ──────────────────────────────
    const wlCount = (await db.select().from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id))).length;

    return ctx.reply({
      embeds: [brandEmbed({
        authorName: ctx.user.globalName ?? ctx.user.username,
        authorIcon: ctx.user.displayAvatarURL({ size: 64 }),
        title: "antiraid",
        description: [
          `antiraid is **${settings.antiraidEnabled ? "enabled" : "disabled"}**`,
          "",
          `**threshold** — ${settings.antiraidThreshold ?? 8} joins per 10s`,
          `**punishment** — ${settings.antiraidAction ?? "kick"}`,
          `**account age** — ${(settings.antiraidJoinAge ?? 0) > 0 ? `${settings.antiraidJoinAge} days minimum` : "disabled"}`,
          `**avatar gate** — ${ (settings as any).antiraidRequireAvatar ? "on" : "off" }`,
          `**lock on raid** — ${settings.antiraidLockOnRaid ? "on" : "off"}`,
          `**manual raid mode** — ${ (settings as any).antiraidManualState ? "🔴 active" : "off" }`,
          `**log channel** — ${settings.antiraidLogChannel ? `<#${settings.antiraidLogChannel}>` : "not set"}`,
          `**whitelisted** — ${wlCount} user${wlCount !== 1 ? "s" : ""}`,
          "",
          `use \`antiraid enable\` or \`antiraid disable\` to toggle`,
        ].join("\n"),
      })],
    });
  },
};
