import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { antinukeWhitelist } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { invalidateWhitelistCache } from "../../features/antinuke.js";

/*
  ,antinuke enable
  ,antinuke disable
  ,antinuke status
  ,antinuke action <ban|kick|strip>
  ,antinuke threshold <2-10>
  ,antinuke log #channel
  ,antinuke log off
  ,antinuke whitelist add @user
  ,antinuke whitelist remove @user
  ,antinuke whitelist list
*/

export const command: HybridCommand = {
  name: "antinuke",
  description: "Configure the anti-nuke protection system.",
  category: "settings",
  permission: "owner",
  guildOnly: true,
  usage: "antinuke <enable|disable|status|action|threshold|log|whitelist> [value]",
  options: [
    {
      name: "subcommand",
      description: "enable | disable | status | action | threshold | log | whitelist",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "enable",           value: "enable" },
        { name: "disable",          value: "disable" },
        { name: "status",           value: "status" },
        { name: "action",           value: "action" },
        { name: "threshold",        value: "threshold" },
        { name: "log",              value: "log" },
        { name: "whitelist add",    value: "whitelist-add" },
        { name: "whitelist remove", value: "whitelist-remove" },
        { name: "whitelist list",   value: "whitelist-list" },
      ],
    },
    {
      name: "value",
      description: "For action: ban|kick|strip  |  For threshold: 2-10  |  For log: #channel or 'off'",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "user",
      description: "For whitelist add/remove: the user to whitelist",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
    {
      name: "channel",
      description: "For log: channel to send anti-nuke alerts to",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    // Parse prefix args: ,antinuke whitelist add @user  → sub = "whitelist", arg2 = "add"
    const rawArgs = ctx.args; // prefix only
    const sub = (ctx.getString("subcommand") ?? rawArgs[0] ?? "").toLowerCase();
    const value = ctx.getString("value") ?? rawArgs[1] ?? "";
    const targetUser = await ctx.getUser("user").catch(() => null);
    const logChannel = ctx.getChannel("channel");

    // Resolve whitelist sub for prefix: ,antinuke whitelist add/remove/list
    let resolvedSub = sub;
    if (sub === "whitelist") {
      const next = (rawArgs[1] ?? "").toLowerCase();
      if (next === "add") resolvedSub = "whitelist-add";
      else if (next === "remove" || next === "rm") resolvedSub = "whitelist-remove";
      else resolvedSub = "whitelist-list";
    }

    const settings = await getGuildSettings(ctx.guild.id);
    const threshold = (settings as any).antinukeThreshold ?? 3;
    const logCh = (settings as any).antinukeLogChannel;

    // ── enable ───────────────────────────────────────────────────────────────
    if (resolvedSub === "enable") {
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: true });
      return ctx.reply({ embeds: [successEmbed("🛡️ Anti-Nuke is now **enabled**.")] });
    }

    // ── disable ──────────────────────────────────────────────────────────────
    if (resolvedSub === "disable") {
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: false });
      return ctx.reply({ embeds: [successEmbed("Anti-Nuke is now **disabled**.")] });
    }

    // ── status ───────────────────────────────────────────────────────────────
    if (resolvedSub === "status") {
      const wlRows = await db
        .select({ userId: antinukeWhitelist.userId })
        .from(antinukeWhitelist)
        .where(eq(antinukeWhitelist.guildId, ctx.guild.id));
      const wlList = wlRows.length
        ? wlRows.map((r) => `<@${r.userId}>`).join(", ")
        : "*none*";

      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "🛡️ Anti-Nuke Status",
            fields: [
              { name: "Enabled",       value: settings.antinukeEnabled ? "✅ Yes" : "❌ No",     inline: true },
              { name: "Punishment",    value: `\`${settings.antinukeAction}\``,                  inline: true },
              { name: "Threshold",     value: `${threshold} actions / 10s`,                     inline: true },
              { name: "Log Channel",   value: logCh ? `<#${logCh}>` : "*not set*",              inline: true },
              { name: "Protected Against", value:
                "• Channel mass-delete/create\n• Role mass-delete/create\n• Mass banning\n• Webhook creation\n• Unauthorized bot adds", inline: false },
              { name: `Whitelist (${wlRows.length})`, value: wlList.slice(0, 1024), inline: false },
            ],
            page: "Anti-Nuke",
          }),
        ],
      });
    }

    // ── action ───────────────────────────────────────────────────────────────
    if (resolvedSub === "action") {
      const v = value.toLowerCase();
      if (!["ban", "kick", "strip"].includes(v)) {
        return ctx.reply({ embeds: [errorEmbed("Punishment must be: `ban`, `kick`, or `strip`.")] });
      }
      await updateGuildSettings(ctx.guild.id, { antinukeAction: v });
      return ctx.reply({ embeds: [successEmbed(`Anti-Nuke punishment set to **${v}**.`)] });
    }

    // ── threshold ────────────────────────────────────────────────────────────
    if (resolvedSub === "threshold") {
      const n = parseInt(value);
      if (isNaN(n) || n < 2 || n > 10) {
        return ctx.reply({ embeds: [errorEmbed("Threshold must be between **2** and **10** (actions per 10 seconds).")] });
      }
      await updateGuildSettings(ctx.guild.id, { antinukeThreshold: n } as any);
      return ctx.reply({ embeds: [successEmbed(`Anti-Nuke threshold set to **${n}** actions per 10 seconds.`)] });
    }

    // ── log ──────────────────────────────────────────────────────────────────
    if (resolvedSub === "log") {
      if (value.toLowerCase() === "off" || (!logChannel && !value)) {
        await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: null } as any);
        return ctx.reply({ embeds: [successEmbed("Anti-Nuke log channel **disabled**.")] });
      }
      const ch = logChannel ?? ctx.guild.channels.cache.find((c) =>
        c.isTextBased() && (c.name?.includes(value.toLowerCase()) || c.id === value.replace(/[<#>]/g, ""))
      );
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Channel not found. Try mentioning it directly.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: ch.id } as any);
      return ctx.reply({ embeds: [successEmbed(`Anti-Nuke alerts will be sent to <#${ch.id}>.`)] });
    }

    // ── whitelist add ────────────────────────────────────────────────────────
    if (resolvedSub === "whitelist-add") {
      const user = targetUser ?? (rawArgs[2] ? await ctx.getUser("user") : null);
      if (!user) return ctx.reply({ embeds: [errorEmbed("Please mention a user to whitelist.")] });
      if (user.id === ctx.guild.ownerId) {
        return ctx.reply({ embeds: [errorEmbed("The guild owner is always whitelisted.")] });
      }
      await db
        .insert(antinukeWhitelist)
        .values({ guildId: ctx.guild.id, userId: user.id })
        .onConflictDoNothing();
      invalidateWhitelistCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`<@${user.id}> added to the Anti-Nuke whitelist. They will not be actioned.`)] });
    }

    // ── whitelist remove ─────────────────────────────────────────────────────
    if (resolvedSub === "whitelist-remove") {
      const user = targetUser;
      if (!user) return ctx.reply({ embeds: [errorEmbed("Please mention a user to remove from the whitelist.")] });
      await db
        .delete(antinukeWhitelist)
        .where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
      invalidateWhitelistCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`<@${user.id}> removed from the Anti-Nuke whitelist.`)] });
    }

    // ── whitelist list ───────────────────────────────────────────────────────
    if (resolvedSub === "whitelist-list") {
      const rows = await db
        .select({ userId: antinukeWhitelist.userId })
        .from(antinukeWhitelist)
        .where(eq(antinukeWhitelist.guildId, ctx.guild.id));
      const list = rows.length
        ? rows.map((r, i) => `${i + 1}. <@${r.userId}> (\`${r.userId}\`)`).join("\n")
        : "*No users are whitelisted.*";
      return ctx.reply({
        embeds: [brandEmbed({
          title: `🛡️ Anti-Nuke Whitelist (${rows.length})`,
          description: list.slice(0, 2000),
          page: "Anti-Nuke",
        })],
      });
    }

    return ctx.reply({
      embeds: [brandEmbed({
        title: "🛡️ Anti-Nuke Help",
        description: [
          "`,antinuke enable` / `disable`",
          "`,antinuke status`",
          "`,antinuke action <ban|kick|strip>`",
          "`,antinuke threshold <2-10>` — actions per 10s before triggering",
          "`,antinuke log <#channel|off>`",
          "`,antinuke whitelist add @user`",
          "`,antinuke whitelist remove @user`",
          "`,antinuke whitelist list`",
          "",
          "**Detects:** mass channel/role delete or create, mass bans, webhooks, bot adds",
        ].join("\n"),
        page: "Anti-Nuke",
      })],
    });
  },
};
