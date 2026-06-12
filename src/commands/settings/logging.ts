import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { logIgnores } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const EVENT_MAP: Record<string, { key: string; label: string; emoji: string }> = {
  messages: { key: "msgLogChannel",    label: "Messages",    emoji: "💬" },
  message:  { key: "msgLogChannel",    label: "Messages",    emoji: "💬" },
  msg:      { key: "msgLogChannel",    label: "Messages",    emoji: "💬" },
  members:  { key: "joinLogChannel",   label: "Members",     emoji: "🚪" },
  member:   { key: "joinLogChannel",   label: "Members",     emoji: "🚪" },
  joins:    { key: "joinLogChannel",   label: "Members",     emoji: "🚪" },
  voice:    { key: "voiceLogChannel",  label: "Voice",       emoji: "🔊" },
  roles:    { key: "roleLogChannel",   label: "Roles",       emoji: "🎭" },
  role:     { key: "roleLogChannel",   label: "Roles",       emoji: "🎭" },
  channels: { key: "serverLogChannel", label: "Channels",    emoji: "📁" },
  channel:  { key: "serverLogChannel", label: "Channels",    emoji: "📁" },
  invites:  { key: "serverLogChannel", label: "Channels",    emoji: "📨" },
  invite:   { key: "serverLogChannel", label: "Channels",    emoji: "📨" },
  emojis:   { key: "serverLogChannel", label: "Emojis",      emoji: "😀" },
  emoji:    { key: "serverLogChannel", label: "Emojis",      emoji: "😀" },
  moderation: { key: "modLogChannel",  label: "Moderation",  emoji: "🔨" },
  mod:      { key: "modLogChannel",    label: "Moderation",  emoji: "🔨" },
  server:   { key: "serverLogChannel", label: "Server",      emoji: "🏠" },
};

const ALL_KEYS = [
  { key: "msgLogChannel",    label: "Messages",   emoji: "💬" },
  { key: "joinLogChannel",   label: "Members",    emoji: "🚪" },
  { key: "modLogChannel",    label: "Moderation", emoji: "🔨" },
  { key: "voiceLogChannel",  label: "Voice",      emoji: "🔊" },
  { key: "roleLogChannel",   label: "Roles",      emoji: "🎭" },
  { key: "serverLogChannel", label: "Server",     emoji: "🏠" },
];

export const command: HybridCommand = {
  name: "logging",
  description: "Manage logging events for your server.",
  usage: "log <add|remove|list|reset|ignore> [channel] [event]",
  examples: [
    "log add #logs messages",
    "log add #logs members",
    "log add #logs voice",
    "log add #logs roles",
    "log add #logs channels",
    "log add #logs invites",
    "log add #logs emojis",
    "log remove #logs messages",
    "log list",
    "log reset",
    "log ignore add #bot-spam",
    "log ignore add @bot",
    "log ignore list",
  ],
  aliases: ["logs", "log"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    {
      name: "subcommand",
      description: "add | remove | list | reset | ignore",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "add",    value: "add"    },
        { name: "remove", value: "remove" },
        { name: "list",   value: "list"   },
        { name: "reset",  value: "reset"  },
        { name: "ignore", value: "ignore" },
      ],
    },
    { name: "channel", description: "Log channel",                                       type: ApplicationCommandOptionType.Channel, required: false },
    { name: "event",   description: "messages | members | voice | roles | channels | invites | emojis | moderation", type: ApplicationCommandOptionType.String,  required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    // resolve channel and event — support both orders:
    // prefix:  log add #channel event  (args[1]=channel, args[2]=event)
    // slash:   channel option + event option
    const rawArg1 = ctx.args[1] ?? "";
    const rawArg2 = ctx.args[2] ?? "";

    const chanIdFromArg = rawArg1.replace(/[<#>]/g, "");
    const channelFromGuild = ctx.guild.channels.cache.get(chanIdFromArg);
    const channelArg = ctx.getChannel("channel") ?? channelFromGuild ?? null;
    const channelId  = (channelArg as any)?.id ?? null;

    const eventArg = (ctx.getString("event") ?? rawArg2 ?? rawArg1 ?? "").toLowerCase();

    // ── ignore ────────────────────────────────────────────────────────────────
    if (sub === "ignore") {
      const ignoreSub = eventArg || rawArg1;
      const rawTarget = ctx.args[2] ?? ctx.args[1] ?? channelId ?? "";
      const targetId  = rawTarget.replace(/[<#@!>]/g, "");

      if (ignoreSub === "list") {
        const rows = await db.select().from(logIgnores).where(eq(logIgnores.guildId, ctx.guild.id));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No ignored channels or members.")] });
        const lines = rows.map(r =>
          ctx.guild!.channels.cache.has(r.targetId)
            ? `<#${r.targetId}>`
            : `<@${r.targetId}>`
        );
        return ctx.reply({ embeds: [brandEmbed({ title: "Log Ignores", description: lines.join("\n") })] });
      }

      if (!targetId) return ctx.reply({ embeds: [errorEmbed("Mention a **channel** or **member** to ignore.")] });

      if (ignoreSub === "add" || (!ignoreSub && targetId)) {
        await db.insert(logIgnores).values({ guildId: ctx.guild.id, targetId }).onConflictDoNothing();
        const mention = ctx.guild.channels.cache.has(targetId) ? `<#${targetId}>` : `<@${targetId}>`;
        return ctx.reply({ embeds: [successEmbed(`${mention} will be ignored from logs.`)] });
      }

      if (ignoreSub === "remove") {
        await db.delete(logIgnores).where(and(eq(logIgnores.guildId, ctx.guild.id), eq(logIgnores.targetId, targetId)));
        return ctx.reply({ embeds: [successEmbed(`removed from the log ignore list.`)] });
      }

      return ctx.reply({ embeds: [errorEmbed("Usage: `log ignore add/remove/list`")] });
    }

    // ── list ──────────────────────────────────────────────────────────────────
    if (sub === "list") {
      const s      = await getGuildSettings(ctx.guild.id);
      const fields = ALL_KEYS.map(({ key, label, emoji }) => ({
        name:   `${emoji} ${label}`,
        value:  (s as any)[key] ? `<#${(s as any)[key]}>` : "not set",
        inline: true,
      }));
      const ignores = await db.select().from(logIgnores).where(eq(logIgnores.guildId, ctx.guild.id));
      const ignoreList = ignores.length
        ? ignores.map(r => ctx.guild!.channels.cache.has(r.targetId) ? `<#${r.targetId}>` : `<@${r.targetId}>`).join(", ")
        : "none";
      fields.push({ name: "🚫 Ignored", value: ignoreList, inline: false });
      return ctx.reply({ embeds: [brandEmbed({ title: "Logging Configuration", fields })] });
    }

    // ── reset ─────────────────────────────────────────────────────────────────
    if (sub === "reset") {
      await updateGuildSettings(ctx.guild.id, Object.fromEntries(ALL_KEYS.map(k => [k.key, null])) as any);
      return ctx.reply({ embeds: [successEmbed("All log channels have been cleared.")] });
    }

    // ── add | remove ──────────────────────────────────────────────────────────
    if (sub === "add" || sub === "remove") {
      const event = eventArg;

      if (!event && sub === "remove") {
        // remove all
        if (!channelId) {
          await updateGuildSettings(ctx.guild.id, Object.fromEntries(ALL_KEYS.map(k => [k.key, null])) as any);
          return ctx.reply({ embeds: [successEmbed("All log channels removed.")] });
        }
        // remove all events for specific channel
        const patch = Object.fromEntries(
          ALL_KEYS
            .filter(k => true) // remove channel if it matches
            .map(k => [k.key, null])
        );
        await updateGuildSettings(ctx.guild.id, patch as any);
        return ctx.reply({ embeds: [successEmbed(`All log events removed from <#${channelId}>.`)] });
      }

      if (event === "all") {
        if (sub === "remove") {
          await updateGuildSettings(ctx.guild.id, Object.fromEntries(ALL_KEYS.map(k => [k.key, null])) as any);
          return ctx.reply({ embeds: [successEmbed("All log channels removed.")] });
        }
        if (!channelId) return ctx.reply({ embeds: [errorEmbed("Provide a **channel**.")] });
        await updateGuildSettings(ctx.guild.id, Object.fromEntries(ALL_KEYS.map(k => [k.key, channelId])) as any);
        return ctx.reply({ embeds: [successEmbed(`All log events → <#${channelId}>.`)] });
      }

      const meta = event ? EVENT_MAP[event] : null;
      if (!meta) {
        const available = "messages, members, voice, roles, channels, invites, emojis, moderation, all";
        return ctx.reply({ embeds: [errorEmbed(`Unknown event. Available: ${available}`)] });
      }

      if (sub === "remove") {
        await updateGuildSettings(ctx.guild.id, { [meta.key]: null } as any);
        return ctx.reply({ embeds: [successEmbed(`${meta.emoji} **${meta.label}** logging disabled.`)] });
      }

      if (!channelId) return ctx.reply({ embeds: [errorEmbed("Provide a **channel**.")] });
      await updateGuildSettings(ctx.guild.id, { [meta.key]: channelId } as any);
      return ctx.reply({ embeds: [successEmbed(`${meta.emoji} **${meta.label}** events → <#${channelId}>.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Usage: `log add (channel) (event)` or `log remove (channel) (event)`")] });
  },
};
