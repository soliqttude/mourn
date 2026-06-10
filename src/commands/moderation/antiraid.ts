import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "antiraid",
  aliases: ["raid"],
  description: "Configure anti-raid protection.",
  usage: "antiraid [status|enable|disable|action|threshold|age|avatar|log|lock|state] [value]",
  examples: [
    "antiraid enable",
    "antiraid disable",
    "antiraid status",
    "antiraid action kick",
    "antiraid threshold 8",
    "antiraid age 7",
    "antiraid avatar on",
    "antiraid log #logs",
    "antiraid lock on",
    "antiraid state on",
  ],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  userPermissions: ["Administrator"],
  options: [
    { name: "subcommand", description: "enable|disable|status|action|threshold|age|avatar|log|lock|state", type: ApplicationCommandOptionType.String, required: false },
    { name: "value", description: "on/off, number, channel, kick/ban/timeout", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "log channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const value = (ctx.getString("value") ?? ctx.args[1] ?? "").toLowerCase();
    const settings = await getGuildSettings(ctx.guild.id);

    if (!sub || sub === "status") {
      const fields = [
        { name: "enabled",        value: settings.antiraidEnabled ? "on" : "off", inline: true },
        { name: "manual state",   value: (settings as any).antiraidManualState ? "🔴 raid mode active" : "✅ normal", inline: true },
        { name: "action",         value: settings.antiraidAction ?? "kick", inline: true },
        { name: "threshold",      value: `${settings.antiraidThreshold} joins / 10s`, inline: true },
        { name: "min account age",value: `${settings.antiraidJoinAge} days`, inline: true },
        { name: "require avatar", value: (settings as any).antiraidRequireAvatar ? "on" : "off", inline: true },
        { name: "lock on raid",   value: settings.antiraidLockOnRaid ? "on" : "off", inline: true },
        { name: "log channel",    value: settings.antiraidLogChannel ? `<#${settings.antiraidLogChannel}>` : "not set", inline: true },
      ];
      return ctx.reply({ embeds: [brandEmbed({ title: "antiraid configuration", fields })] });
    }

    if (sub === "enable" || (sub === "toggle" && !settings.antiraidEnabled)) {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: true });
      return ctx.reply({ embeds: [successEmbed("antiraid protection **enabled**.")] });
    }

    if (sub === "disable" || (sub === "toggle" && settings.antiraidEnabled)) {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: false });
      return ctx.reply({ embeds: [successEmbed("antiraid protection **disabled**.")] });
    }

    if (sub === "action") {
      if (!["kick", "ban", "timeout"].includes(value)) {
        return ctx.reply({ embeds: [errorEmbed("action must be `kick`, `ban`, or `timeout`.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidAction: value });
      return ctx.reply({ embeds: [successEmbed(`antiraid action set to **${value}**.`)] });
    }

    if (sub === "threshold") {
      const n = parseInt(value);
      if (isNaN(n) || n < 2 || n > 50) return ctx.reply({ embeds: [errorEmbed("threshold must be 2–50.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidThreshold: n });
      return ctx.reply({ embeds: [successEmbed(`antiraid triggers when **${n}** members join within 10s.`)] });
    }

    if (sub === "age") {
      const n = parseInt(value);
      if (isNaN(n) || n < 0 || n > 365) return ctx.reply({ embeds: [errorEmbed("age must be 0–365 days (0 = disabled).")] });
      await updateGuildSettings(ctx.guild.id, { antiraidJoinAge: n });
      return ctx.reply({ embeds: [successEmbed(n === 0 ? "account age gate disabled." : `accounts younger than **${n} days** will be actioned on join.`)] });
    }

    if (sub === "avatar") {
      const on = value === "on" || value === "true";
      await updateGuildSettings(ctx.guild.id, { antiraidRequireAvatar: on } as any);
      return ctx.reply({ embeds: [successEmbed(`avatar requirement **${on ? "enabled" : "disabled"}** — members without an avatar will be ${settings.antiraidAction ?? "kicked"} on join.`)] });
    }

    if (sub === "log") {
      if (value === "off" || (!value && !ctx.getChannel("channel"))) {
        await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: null });
        return ctx.reply({ embeds: [successEmbed("antiraid log disabled.")] });
      }
      const ch = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get(value.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("channel not found.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`antiraid alerts → <#${ch.id}>.`)] });
    }

    if (sub === "lock") {
      const on = value === "on" || value === "true";
      await updateGuildSettings(ctx.guild.id, { antiraidLockOnRaid: on });
      return ctx.reply({ embeds: [successEmbed(`server lockdown on raid **${on ? "enabled" : "disabled"}**.`)] });
    }

    if (sub === "state") {
      const on = value === "on" || value === "true" || value === "1";
      await updateGuildSettings(ctx.guild.id, { antiraidManualState: on } as any);
      return ctx.reply({ embeds: [successEmbed(on ? "🔴 **raid mode manually activated** — all joins will be actioned." : "✅ **raid mode deactivated** — server back to normal.")] });
    }

    return ctx.reply({ embeds: [errorEmbed("unknown subcommand. use: `enable|disable|status|action|threshold|age|avatar|log|lock|state`")] });
  },
};
