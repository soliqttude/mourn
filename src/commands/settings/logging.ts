import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

const TYPE_MAP: Record<string, { key: string; label: string; emoji: string }> = {
  message:    { key: "msgLogChannel",    label: "Message",    emoji: "💬" },
  messages:   { key: "msgLogChannel",    label: "Message",    emoji: "💬" },
  msg:        { key: "msgLogChannel",    label: "Message",    emoji: "💬" },
  member:     { key: "joinLogChannel",   label: "Member",     emoji: "🚪" },
  members:    { key: "joinLogChannel",   label: "Member",     emoji: "🚪" },
  join:       { key: "joinLogChannel",   label: "Member",     emoji: "🚪" },
  moderation: { key: "modLogChannel",    label: "Moderation", emoji: "🔨" },
  mod:        { key: "modLogChannel",    label: "Moderation", emoji: "🔨" },
  voice:      { key: "voiceLogChannel",  label: "Voice",      emoji: "🔊" },
  role:       { key: "roleLogChannel",   label: "Role",       emoji: "🎭" },
  roles:      { key: "roleLogChannel",   label: "Role",       emoji: "🎭" },
  server:     { key: "serverLogChannel", label: "Server",     emoji: "🏠" },
  guild:      { key: "serverLogChannel", label: "Server",     emoji: "🏠" },
};

const ALL_KEYS = [
  { key: "msgLogChannel",    label: "Message",    emoji: "💬" },
  { key: "joinLogChannel",   label: "Member",     emoji: "🚪" },
  { key: "modLogChannel",    label: "Moderation", emoji: "🔨" },
  { key: "voiceLogChannel",  label: "Voice",      emoji: "🔊" },
  { key: "roleLogChannel",   label: "Role",       emoji: "🎭" },
  { key: "serverLogChannel", label: "Server",     emoji: "🏠" },
];

export const command: HybridCommand = {
  name: "logging",
  description: "Manage log channels. Subcommands: add, remove, list, reset",
  usage: "logging <add|remove|list|reset> [type] [channel]",
  examples: [
    "logging add all #logs",
    "logging add message #msg-logs",
    "logging add member #joins",
    "logging add moderation #mod-logs",
    "logging add voice #voice-logs",
    "logging add role #role-logs",
    "logging add server #server-logs",
    "logging remove message",
    "logging list",
    "logging reset",
  ],
  aliases: ["logs", "log"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    {
      name: "subcommand",
      description: "add | remove | list | reset",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
        { name: "reset", value: "reset" },
      ],
    },
    {
      name: "type",
      description: "all | message | member | moderation | voice | role | server",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "channel",
      description: "The channel to log into",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand", true) ?? ctx.args[0] ?? "").toLowerCase();
    const settings = await getGuildSettings(ctx.guild.id);

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (sub === "list") {
      const fields = ALL_KEYS.map(({ key, label, emoji }) => {
        const val = (settings as any)[key] as string | null;
        return { name: `${emoji}  ${label}`, value: val ? `<#${val}>` : "`not set`", inline: true };
      });
      return ctx.reply({
        embeds: [brandEmbed({ title: "Logging Channels", description: "Current log channel configuration.", fields, page: "Logs" })],
      });
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    if (sub === "reset") {
      const patch = Object.fromEntries(ALL_KEYS.map(({ key }) => [key, null]));
      await updateGuildSettings(ctx.guild.id, patch as any);
      return ctx.reply({ embeds: [successEmbed("All log channels have been cleared.")] });
    }

    // ── ADD / REMOVE ──────────────────────────────────────────────────────────
    if (sub !== "add" && sub !== "remove") {
      return ctx.reply({ embeds: [errorEmbed("Usage: `logging <add|remove|list|reset> [type] [channel]`")] });
    }

    const typeRaw = (ctx.getString("type") ?? ctx.args[1] ?? "").toLowerCase();

    // ── ALL shortcut ──────────────────────────────────────────────────────────
    if (typeRaw === "all") {
      if (sub === "remove") {
        const patch = Object.fromEntries(ALL_KEYS.map(({ key }) => [key, null]));
        await updateGuildSettings(ctx.guild.id, patch as any);
        return ctx.reply({ embeds: [successEmbed("All log channels have been removed.")] });
      }

      const channel =
        ctx.getChannel("channel") ??
        (() => {
          const raw = ctx.args[2]?.replace(/[<#>]/g, "");
          return raw ? { id: raw } : null;
        })();

      if (!channel) return ctx.reply({ embeds: [errorEmbed("Please provide a channel.")] });

      const patch = Object.fromEntries(ALL_KEYS.map(({ key }) => [key, channel.id]));
      await updateGuildSettings(ctx.guild.id, patch as any);

      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "All Logs Set",
            description: `All log types are now pointing to <#${channel.id}>.`,
            fields: ALL_KEYS.map(({ emoji, label }) => ({
              name: `${emoji}  ${label}`,
              value: `<#${channel.id}>`,
              inline: true,
            })),
            page: "Logs",
          }),
        ],
      });
    }

    // ── single type ───────────────────────────────────────────────────────────
    const entry = TYPE_MAP[typeRaw];
    if (!entry) {
      return ctx.reply({
        embeds: [errorEmbed(`Invalid type \`${typeRaw}\`.\n\nValid types: \`all\`, \`message\`, \`member\`, \`moderation\`, \`voice\`, \`role\`, \`server\``)],
      });
    }

    if (sub === "remove") {
      await updateGuildSettings(ctx.guild.id, { [entry.key]: null } as any);
      return ctx.reply({ embeds: [successEmbed(`${entry.emoji} **${entry.label}** log channel removed.`)] });
    }

    const channel =
      ctx.getChannel("channel") ??
      (() => {
        const raw = ctx.args[2]?.replace(/[<#>]/g, "");
        return raw ? { id: raw } : null;
      })();

    if (!channel) return ctx.reply({ embeds: [errorEmbed("Please provide a channel.")] });

    await updateGuildSettings(ctx.guild.id, { [entry.key]: channel.id } as any);
    return ctx.reply({
      embeds: [successEmbed(`${entry.emoji} **${entry.label}** logs → <#${channel.id}>.`)],
    });
  },
};
