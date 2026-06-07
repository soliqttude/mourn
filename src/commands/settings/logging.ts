import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { logIgnores } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const TYPE_MAP: Record<string, { key: string; label: string; emoji: string }> = {
  message: { key: "msgLogChannel", label: "Message", emoji: "💬" },
  messages: { key: "msgLogChannel", label: "Message", emoji: "💬" },
  msg: { key: "msgLogChannel", label: "Message", emoji: "💬" },
  member: { key: "joinLogChannel", label: "Member", emoji: "🚪" },
  members: { key: "joinLogChannel", label: "Member", emoji: "🚪" },
  join: { key: "joinLogChannel", label: "Member", emoji: "🚪" },
  moderation: { key: "modLogChannel", label: "Moderation", emoji: "🔨" },
  mod: { key: "modLogChannel", label: "Moderation", emoji: "🔨" },
  voice: { key: "voiceLogChannel", label: "Voice", emoji: "🔊" },
  role: { key: "roleLogChannel", label: "Role", emoji: "🎭" },
  roles: { key: "roleLogChannel", label: "Role", emoji: "🎭" },
  server: { key: "serverLogChannel", label: "Server", emoji: "🏠" },
  guild: { key: "serverLogChannel", label: "Server", emoji: "🏠" },
};

const ALL_KEYS = [
  { key: "msgLogChannel", label: "Message", emoji: "💬" },
  { key: "joinLogChannel", label: "Member", emoji: "🚪" },
  { key: "modLogChannel", label: "Moderation", emoji: "🔨" },
  { key: "voiceLogChannel", label: "Voice", emoji: "🔊" },
  { key: "roleLogChannel", label: "Role", emoji: "🎭" },
  { key: "serverLogChannel", label: "Server", emoji: "🏠" },
];

export const command: HybridCommand = {
  name: "logging",
  description: "Manage log channels and ignore list.",
  usage: "logging <add|remove|list|reset|ignore> [args]",
  examples: [
    "logging add all #logs",
    "logging add message #msg-logs",
    "logging remove message",
    "logging list",
    "logging reset",
    "logging ignore add #bot-spam",
    "logging ignore add @bot",
    "logging ignore remove #bot-spam",
    "logging ignore list",
  ],
  aliases: ["logs", "log"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list | reset | ignore", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }, { name: "reset", value: "reset" }, { name: "ignore", value: "ignore" }] },
    { name: "type", description: "all | message | member | moderation | voice | role | server", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Log channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const type = (ctx.getString("type") ?? ctx.args[1] ?? "").toLowerCase();
    const channelArg = ctx.getChannel("channel") ?? (ctx.args[2] ? ctx.guild.channels.cache.get(ctx.args[2].replace(/[<#>]/g, "")) : null);
    const channelId = (channelArg as any)?.id;

    // ── ignore subcommand ──────────────────────────────────────────────────────
    if (sub === "ignore") {
      const ignoreSub = type;
      const rawTarget = ctx.args[2] ?? channelId ?? "";
      const targetId = rawTarget.replace(/[<#@!>]/g, "");

      if (ignoreSub === "list") {
        const rows = await db.select().from(logIgnores).where(eq(logIgnores.guildId, ctx.guild.id));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no log ignore entries.")] });
        const lines = rows.map(r => ctx.guild!.channels.cache.has(r.targetId) ? `<#${r.targetId}>` : `<@${r.targetId}>`);
        return ctx.reply({ embeds: [brandEmbed({ title: "Log Ignores", description: lines.join("\n") })] });
      }

      if (!targetId) return ctx.reply({ embeds: [errorEmbed("mention a channel or user.")] });

      if (ignoreSub === "add") {
        await db.insert(logIgnores).values({ guildId: ctx.guild.id, targetId }).onConflictDoNothing();
        return ctx.reply({ embeds: [successEmbed(`<#${targetId}> / <@${targetId}> added to log ignore list.`)] });
      }

      if (ignoreSub === "remove") {
        await db.delete(logIgnores).where(and(eq(logIgnores.guildId, ctx.guild.id), eq(logIgnores.targetId, targetId)));
        return ctx.reply({ embeds: [successEmbed(`removed from log ignore list.`)] });
      }

      return ctx.reply({ embeds: [errorEmbed("use: logging ignore add | remove | list")] });
    }

    // ── list ───────────────────────────────────────────────────────────────────
    if (sub === "list") {
      const s = await getGuildSettings(ctx.guild.id);
      const fields = ALL_KEYS.map(({ key, label, emoji }) => ({
        name: `${emoji} ${label}`,
        value: (s as any)[key] ? `<#${(s as any)[key]}>` : "not set",
        inline: true,
      }));
      return ctx.reply({ embeds: [brandEmbed({ title: "Log Channels", fields })] });
    }

    // ── reset ──────────────────────────────────────────────────────────────────
    if (sub === "reset") {
      const patch = Object.fromEntries(ALL_KEYS.map(k => [k.key, null]));
      await updateGuildSettings(ctx.guild.id, patch as any);
      return ctx.reply({ embeds: [successEmbed("all log channels cleared.")] });
    }

    // ── add | remove ───────────────────────────────────────────────────────────
    if (sub === "add" || sub === "remove") {
      if (!type) return ctx.reply({ embeds: [errorEmbed("provide a log type.")] });

      if (type === "all") {
        if (sub === "remove") {
          await updateGuildSettings(ctx.guild.id, Object.fromEntries(ALL_KEYS.map(k => [k.key, null])) as any);
          return ctx.reply({ embeds: [successEmbed("all log channels removed.")] });
        }
        if (!channelId) return ctx.reply({ embeds: [errorEmbed("provide a channel.")] });
        await updateGuildSettings(ctx.guild.id, Object.fromEntries(ALL_KEYS.map(k => [k.key, channelId])) as any);
        return ctx.reply({ embeds: [successEmbed(`all log types set to <#${channelId}>.`)] });
      }

      const meta = TYPE_MAP[type];
      if (!meta) return ctx.reply({ embeds: [errorEmbed(`unknown log type. options: ${Object.keys(TYPE_MAP).filter((_, i) => i % 2 === 0).join(", ")}`)] });

      if (sub === "remove") {
        await updateGuildSettings(ctx.guild.id, { [meta.key]: null } as any);
        return ctx.reply({ embeds: [successEmbed(`${meta.emoji} **${meta.label}** log channel removed.`)] });
      }

      if (!channelId) return ctx.reply({ embeds: [errorEmbed("provide a channel.")] });
      await updateGuildSettings(ctx.guild.id, { [meta.key]: channelId } as any);
      return ctx.reply({ embeds: [successEmbed(`${meta.emoji} **${meta.label}** logs → <#${channelId}>.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("unknown subcommand.")] });
  },
};
