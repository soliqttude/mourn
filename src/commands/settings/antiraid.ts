import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

/*
  ,antiraid enable
  ,antiraid disable
  ,antiraid status
  ,antiraid threshold <2-20>
  ,antiraid joinage <0-30>
  ,antiraid action <kick|ban|timeout>
  ,antiraid log #channel / off
  ,antiraid lockdown <on|off>
*/

export const command: HybridCommand = {
  name: "antiraid",
  description: "Configure the anti-raid protection system.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "antiraid <enable|disable|status|threshold|joinage|action|log|lockdown> [value]",
  options: [
    {
      name: "subcommand",
      description: "enable | disable | status | threshold | joinage | action | log | lockdown",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "enable",   value: "enable" },
        { name: "disable",  value: "disable" },
        { name: "status",   value: "status" },
        { name: "threshold",value: "threshold" },
        { name: "joinage",  value: "joinage" },
        { name: "action",   value: "action" },
        { name: "log",      value: "log" },
        { name: "lockdown", value: "lockdown" },
      ],
    },
    {
      name: "value",
      description: "Value for the subcommand (number, on/off, kick/ban/timeout, or channel)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "channel",
      description: "For log: channel to send raid alerts to",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const rawValue = (ctx.getString("value") ?? ctx.args[1] ?? "").toLowerCase();
    const logChannel = ctx.getChannel("channel");

    const settings = await getGuildSettings(ctx.guild.id);
    const raidAction = (settings as any).antiraidAction ?? "kick";
    const logCh = (settings as any).antiraidLogChannel;
    const lockOnRaid = (settings as any).antiraidLockOnRaid ?? false;

    // ── enable ───────────────────────────────────────────────────────────────
    if (sub === "enable") {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: true });
      return ctx.reply({ embeds: [successEmbed("🛡️ Anti-Raid is now **enabled**.")] });
    }

    // ── disable ──────────────────────────────────────────────────────────────
    if (sub === "disable") {
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: false });
      return ctx.reply({ embeds: [successEmbed("Anti-Raid is now **disabled**.")] });
    }

    // ── status ───────────────────────────────────────────────────────────────
    if (sub === "status") {
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "🛡️ Anti-Raid Status",
            fields: [
              { name: "Enabled",        value: settings.antiraidEnabled ? "✅ Yes" : "❌ No",    inline: true },
              { name: "Action",         value: `\`${raidAction}\``,                             inline: true },
              { name: "Threshold",      value: `${settings.antiraidThreshold} joins / 10s`,     inline: true },
              { name: "Min Acct Age",   value: `${settings.antiraidJoinAge} days`,              inline: true },
              { name: "Auto-Lockdown",  value: lockOnRaid ? "✅ Enabled (5 min)" : "❌ Off",    inline: true },
              { name: "Alert Channel",  value: logCh ? `<#${logCh}>` : "*not set*",            inline: true },
              { name: "What it does",   value:
                `• **Age gate:** ${raidAction}s accounts <${settings.antiraidJoinAge} days old\n` +
                `• **Flood:** if ${settings.antiraidThreshold}+ join in 10s, ${raidAction}s ALL of them\n` +
                (lockOnRaid ? "• **Lockdown:** auto-locks server for 5 min on raid" : ""),
                inline: false },
            ],
            page: "Anti-Raid",
          }),
        ],
      });
    }

    // ── threshold ────────────────────────────────────────────────────────────
    if (sub === "threshold") {
      const n = parseInt(rawValue);
      if (isNaN(n) || n < 2 || n > 20) {
        return ctx.reply({ embeds: [errorEmbed("Threshold must be between **2** and **20** (joins per 10 seconds).")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidThreshold: n });
      return ctx.reply({ embeds: [successEmbed(`Anti-Raid threshold set to **${n}** joins per 10 seconds.`)] });
    }

    // ── joinage ──────────────────────────────────────────────────────────────
    if (sub === "joinage") {
      const n = parseInt(rawValue);
      if (isNaN(n) || n < 0 || n > 30) {
        return ctx.reply({ embeds: [errorEmbed("Account age must be between **0** and **30** days. Use 0 to disable the age gate.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidJoinAge: n });
      return ctx.reply({ embeds: [successEmbed(n === 0 ? "Account age gate **disabled**." : `Minimum account age set to **${n}** days.`)] });
    }

    // ── action ───────────────────────────────────────────────────────────────
    if (sub === "action") {
      if (!["kick", "ban", "timeout"].includes(rawValue)) {
        return ctx.reply({ embeds: [errorEmbed("Action must be: `kick`, `ban`, or `timeout` (10 minutes).")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidAction: rawValue } as any);
      return ctx.reply({ embeds: [successEmbed(`Anti-Raid action set to **${rawValue}**.\n${rawValue === "timeout" ? "Raiders will be timed out for 10 minutes." : rawValue === "ban" ? "Raiders will be permanently banned." : "Raiders will be kicked."}`)] });
    }

    // ── log ──────────────────────────────────────────────────────────────────
    if (sub === "log") {
      if (rawValue === "off" || (!logChannel && !rawValue)) {
        await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: null } as any);
        return ctx.reply({ embeds: [successEmbed("Anti-Raid alert channel **disabled**.")] });
      }
      const ch = logChannel ?? ctx.guild.channels.cache.find((c) =>
        c.isTextBased() && (c.id === rawValue.replace(/[<#>]/g, "") || (c as any).name?.includes(rawValue))
      );
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Channel not found. Try mentioning it directly.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: ch.id } as any);
      return ctx.reply({ embeds: [successEmbed(`Raid alerts will be sent to <#${ch.id}>.`)] });
    }

    // ── lockdown ─────────────────────────────────────────────────────────────
    if (sub === "lockdown") {
      const enable = rawValue === "on" || rawValue === "enable" || rawValue === "true";
      const disable = rawValue === "off" || rawValue === "disable" || rawValue === "false";
      if (!enable && !disable) {
        return ctx.reply({ embeds: [errorEmbed("Use `on` or `off`.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antiraidLockOnRaid: enable } as any);
      return ctx.reply({ embeds: [successEmbed(
        enable
          ? "Auto-lockdown **enabled**. When a raid is detected, all text channels will be locked for 5 minutes."
          : "Auto-lockdown **disabled**. Raiders will still be actioned, but channels won't be locked.",
      )] });
    }

    // ── help fallback ─────────────────────────────────────────────────────────
    return ctx.reply({
      embeds: [brandEmbed({
        title: "🛡️ Anti-Raid Help",
        description: [
          "`,antiraid enable` / `disable`",
          "`,antiraid status`",
          "`,antiraid threshold <2-20>` — joins per 10s before triggering",
          "`,antiraid joinage <0-30>` — min account age in days (0 = off)",
          "`,antiraid action <kick|ban|timeout>` — what to do to raiders",
          "`,antiraid log <#channel|off>` — where to send raid alerts",
          "`,antiraid lockdown <on|off>` — auto-lock server for 5 min on raid",
          "",
          "**How it works:**",
          "1. Any user with an account younger than `joinage` days → immediately actioned",
          "2. If `threshold` users join in 10 seconds → ALL of them are actioned",
          "3. If lockdown is on → all text channels locked for 5 minutes",
        ].join("\n"),
        page: "Anti-Raid",
      })],
    });
  },
};
