import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { logIgnores } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const EVENTS: Record<string, { key: string; label: string }> = {
  message: { key: "msgLogChannel", label: "Messages" },
  messages: { key: "msgLogChannel", label: "Messages" },
  member: { key: "joinLogChannel", label: "Members" },
  members: { key: "joinLogChannel", label: "Members" },
  joins: { key: "joinLogChannel", label: "Members" },
  voice: { key: "voiceLogChannel", label: "Voice" },
  role: { key: "roleLogChannel", label: "Roles" },
  roles: { key: "roleLogChannel", label: "Roles" },
  channel: { key: "serverLogChannel", label: "Channels" },
  channels: { key: "serverLogChannel", label: "Channels" },
  invites: { key: "serverLogChannel", label: "Invites" },
  emojis: { key: "serverLogChannel", label: "Emojis" },
  moderation: { key: "modLogChannel", label: "Moderation" },
};

const DISPLAY_EVENTS = ["messages", "members", "voice", "roles", "channels", "moderation"];

function cleanId(value?: string): string {
  return (value ?? "").replace(/[<#@!>]/g, "").trim();
}

function validColor(value: string): boolean {
  return /^#?[0-9a-f]{6}$/i.test(value);
}

export const command: HybridCommand = {
  name: "log",
  aliases: ["logs", "logging"],
  description: "Set up and manage server event logging.",
  usage: "log | log add <channel> <event> | log remove <channel> <event> | log ignore <member or channel> | log ignore list | log color <channel> <event> <color> | log color list <channel>",
  examples: [
    "log add #logs messages",
    "log remove #logs messages",
    "log ignore @mmoudder",
    "log ignore list",
    "log color #logs messages #5865f2",
    "log color list #logs",
  ],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "action", description: "add | remove | ignore | color", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Logging channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "event", description: "Event type", type: ApplicationCommandOptionType.String, required: false },
    { name: "color", description: "Hex embed color, e.g. #5865f2", type: ApplicationCommandOptionType.String, required: false },
    { name: "target", description: "Member or channel to ignore", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const colorListMode = action === "color" && (ctx.args[1] ?? "").toLowerCase() === "list";
    const channel = colorListMode
      ? ctx.guild.channels.cache.get(cleanId(ctx.args[2]))
      : (ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(cleanId(ctx.args[1])));
    const channelId = channel?.id ?? null;
    const eventName = (ctx.getString("event") ?? ctx.args[2] ?? "").toLowerCase();
    const settings = await getGuildSettings(ctx.guild.id);

    if (!action) {
      const lines = DISPLAY_EVENTS.map((event) => {
        const meta = EVENTS[event]!;
        const id = (settings as any)[meta.key];
        return `**${meta.label}:** ${id ? `<#${id}>` : "not configured"}`;
      });
      return ctx.reply({ embeds: [brandEmbed({ title: "Logging Setup", description: lines.join("\n") + "\n\nUse log add to configure an event." })] });
    }

    if (action === "ignore") {
      const sub = (ctx.args[1] ?? "").toLowerCase();
      if (sub === "list") {
        const rows = await db.select().from(logIgnores).where(eq(logIgnores.guildId, ctx.guild.id));
        return ctx.reply({ embeds: [brandEmbed({ title: "Ignored Log Targets", description: rows.length ? rows.map(row => ctx.guild!.channels.cache.has(row.targetId) ? `<#${row.targetId}>` : `<@${row.targetId}>`).join("\n") : "No ignored members or channels." })] });
      }
      const rawTarget = ctx.getString("target") ?? ctx.args[1] ?? "";
      const targetId = cleanId(rawTarget);
      if (!targetId) return ctx.reply({ embeds: [errorEmbed("Provide a member or channel to ignore.")] });
      const targetChannel = ctx.guild.channels.cache.get(targetId);
      const targetMember = targetChannel ? null : await ctx.guild.members.fetch(targetId).catch(() => null);
      if (!targetChannel && !targetMember) return ctx.reply({ embeds: [errorEmbed("That member or channel was not found in this server.")] });
      await db.insert(logIgnores).values({ guildId: ctx.guild.id, targetId }).onConflictDoNothing();
      const mention = targetChannel ? `<#${targetId}>` : `<@${targetId}>`;
      return ctx.reply({ embeds: [successEmbed(`${mention} will be ignored by logging.`)] });
    }

    if (action === "add" || action === "remove") {
      if (!channelId) return ctx.reply({ embeds: [errorEmbed("Provide a logging channel.")] });
      const meta = EVENTS[eventName];
      if (!meta) return ctx.reply({ embeds: [errorEmbed("Unknown event. Use messages, members, voice, roles, channels, or moderation.")] });
      if (action === "add") {
        await updateGuildSettings(ctx.guild.id, { [meta.key]: channelId } as any);
        return ctx.reply({ embeds: [successEmbed(`Logging for **${meta.label}** is now sent to <#${channelId}>.`)] });
      }
      if ((settings as any)[meta.key] !== channelId) {
        return ctx.reply({ embeds: [errorEmbed(`<#${channelId}> is not the configured channel for ${meta.label} logs.`)] });
      }
      await updateGuildSettings(ctx.guild.id, { [meta.key]: null } as any);
      return ctx.reply({ embeds: [successEmbed(`Removed **${meta.label}** logging from <#${channelId}>.`)] });
    }

    if (action === "color") {
      if ((ctx.args[1] ?? "").toLowerCase() === "list") {
        const listChannel = channel;
        if (!listChannel) return ctx.reply({ embeds: [errorEmbed("Provide a channel.")] });
        const colors = (settings.logColors ?? {}) as Record<string, string>;
        const lines = Object.entries(colors).map(([event, color]) => `**${event}:** ${color}`);
        return ctx.reply({ embeds: [brandEmbed({ title: `Log Colors — #${listChannel.name}`, description: lines.length ? lines.join("\n") : "No custom event colors set." })] });
      }
      if (!channelId || !eventName) return ctx.reply({ embeds: [errorEmbed("Provide a channel and event.")] });
      const color = (ctx.getString("color") ?? ctx.args[3] ?? "").trim();
      if (!validColor(color)) return ctx.reply({ embeds: [errorEmbed("Color must be a six-digit hex value, e.g. #5865f2.")] });
      const colors = { ...((settings.logColors ?? {}) as Record<string, string>), [eventName]: color.startsWith("#") ? color : `#${color}` };
      await updateGuildSettings(ctx.guild.id, { logColors: colors });
      return ctx.reply({ embeds: [successEmbed(`Custom color for **${eventName}** logs set to ${colors[eventName]}.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Use log, log add, log remove, log ignore, or log color.")] });
  },
};
