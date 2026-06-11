import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "antiraid",
  description: "Toggle anti-raid on/off, or configure it. ,antiraid | ,antiraid threshold 5 | ,antiraid action kick | ,antiraid joinage 7 | ,antiraid log #ch | ,antiraid lockdown",
  usage: "antiraid [subcommand] [value] [channel]",
  examples: ["antiraid"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "(blank = toggle) status | threshold | joinage | action | log | lockdown", type: ApplicationCommandOptionType.String, required: false },
    { name: "value", description: "Number, kick/ban/timeout, #channel, on/off", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "For log", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const rawValue = (ctx.getString("value") ?? ctx.args[1] ?? "").toLowerCase();
    const logChannel = ctx.getChannel("channel");
    const settings = await getGuildSettings(ctx.guild.id);

    // ── no args = toggle ─────────────────────────────────────────────────────
    if (!sub) {
      const enabled = !settings.antiraidEnabled;
      await updateGuildSettings(ctx.guild.id, { antiraidEnabled: enabled });
      return ctx.reply({ embeds: [successEmbed(`Anti-Raid is now **${enabled ? "enabled" : "disabled"}**.`)] });
    }

    if (sub === "status") {
      return ctx.reply({ embeds: [brandEmbed({
        title: "Anti-Raid Status",
        fields: [
          { name: "Enabled",       value: settings.antiraidEnabled ? "on" : "off",                      inline: true },
          { name: "Action",        value: `\`${(settings as any).antiraidAction ?? "kick"}\``,           inline: true },
          { name: "Threshold",     value: `${settings.antiraidThreshold} joins / 10s`,                  inline: true },
          { name: "Min Acct Age",  value: `${settings.antiraidJoinAge} days`,                           inline: true },
          { name: "Auto-Lockdown", value: (settings as any).antiraidLockOnRaid ? "on" : "off",          inline: true },
          { name: "Alert Channel", value: (settings as any).antiraidLogChannel ? `<#${(settings as any).antiraidLogChannel}>` : "not set", inline: true },
        ],
        page: "Anti-Raid",
      })] });
    }

    if (sub === "threshold") {
      const n = parseInt(rawValue);
      if (isNaN(n) || n < 2 || n > 20) return ctx.reply({ embeds: [errorEmbed("Threshold must be 2–20.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidThreshold: n });
      return ctx.reply({ embeds: [successEmbed(`Threshold set to **${n}** joins per 10s.`)] });
    }

    if (sub === "joinage") {
      const n = parseInt(rawValue);
      if (isNaN(n) || n < 0 || n > 30) return ctx.reply({ embeds: [errorEmbed("Account age must be 0–30 days.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidJoinAge: n });
      return ctx.reply({ embeds: [successEmbed(n === 0 ? "Account age gate disabled." : `Min account age set to **${n}** days.`)] });
    }

    if (sub === "action") {
      if (!["kick", "ban", "timeout"].includes(rawValue)) return ctx.reply({ embeds: [errorEmbed("Use: `kick`, `ban`, or `timeout`.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidAction: rawValue } as any);
      return ctx.reply({ embeds: [successEmbed(`Anti-Raid action set to **${rawValue}**.`)] });
    }

    if (sub === "log") {
      if (!logChannel && (!rawValue || rawValue === "off")) {
        await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: null } as any);
        return ctx.reply({ embeds: [successEmbed("Anti-Raid log disabled.")] });
      }
      const ch = logChannel ?? ctx.guild.channels.cache.find(c => c.isTextBased() && (c.id === rawValue.replace(/[<#>]/g, "") || (c as any).name?.includes(rawValue)));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("**Channel** not found.")] });
      await updateGuildSettings(ctx.guild.id, { antiraidLogChannel: ch.id } as any);
      return ctx.reply({ embeds: [successEmbed(`Raid alerts → <#${ch.id}>.`)] });
    }

    // ── lockdown — toggle ────────────────────────────────────────────────────
    if (sub === "lockdown") {
      const current = (settings as any).antiraidLockOnRaid ?? false;
      const enabled = rawValue === "on" ? true : rawValue === "off" ? false : !current;
      await updateGuildSettings(ctx.guild.id, { antiraidLockOnRaid: enabled } as any);
      return ctx.reply({ embeds: [successEmbed(`Auto-lockdown on raid is now **${enabled ? "enabled" : "disabled"}**.`)] });
    }

    
    if (sub === 'avatar') {
      const enabled = rawValue === 'on' ? true : rawValue === 'off' ? false : !(settings as any).antiraidAvatarCheck;
      await updateGuildSettings(ctx.guild.id, { antiraidAvatarCheck: enabled } as any);
      return ctx.reply({ embeds: [successEmbed(`avatar check (kick members with no avatar) is now \${enabled ? 'enabled' : 'disabled'}.`)] });
    }

    if (sub === 'minage' || sub === 'minage') {
      const n = parseInt(rawValue);
      if (isNaN(n) || n < 0 || n > 365) return ctx.reply({ embeds: [errorEmbed('Min age must be 0–365 days (0 = disabled).')] });
      await updateGuildSettings(ctx.guild.id, { antiraidMinAge: n } as any);
      return ctx.reply({ embeds: [successEmbed(n === 0 ? 'minimum account age check disabled.' : `minimum account age set to \${n} days.`)] });
    }

    return ctx.reply({ embeds: [brandEmbed({
      title: "Anti-Raid",
      description: [
        "`,antiraid` — toggle on/off",
        "`,antiraid status`",
        "`,antiraid threshold <2-20>`",
        "`,antiraid joinage <0-30>`",
        "`,antiraid action <kick|ban|timeout>`",
        "`,antiraid log <#channel>`",
        "`,antiraid lockdown` — toggle auto-lockdown",
      ].join("\n"),
      page: "Anti-Raid",
    })] });
  },
};
