import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { antinukeWhitelist } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { invalidateWhitelistCache } from "../../features/antinuke.js";

export const command: HybridCommand = {
  name: "antinuke",
  description: "Toggle anti-nuke on/off, or configure it. ,antinuke | ,antinuke action ban | ,antinuke threshold 3 | ,antinuke log #ch | ,antinuke whitelist @user",
  usage: "antinuke [subcommand] [value] [user] [channel]",
  examples: ["antinuke"],
  category: "settings",
  permission: "owner",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "(blank = toggle) status | action | threshold | log | whitelist", type: ApplicationCommandOptionType.String, required: false },
    { name: "value", description: "ban|kick|strip · 2-10 · #channel · @user", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "For whitelist", type: ApplicationCommandOptionType.User, required: false },
    { name: "channel", description: "For log", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rawArgs = ctx.args;
    const sub = (ctx.getString("subcommand") ?? rawArgs[0] ?? "").toLowerCase();
    const value = ctx.getString("value") ?? rawArgs[1] ?? "";
    const targetUser = await ctx.getUser("user").catch(() => null);
    const logChannel = ctx.getChannel("channel");
    const settings = await getGuildSettings(ctx.guild.id);

    // ── no args = toggle ─────────────────────────────────────────────────────
    if (!sub) {
      const enabled = !settings.antinukeEnabled;
      await updateGuildSettings(ctx.guild.id, { antinukeEnabled: enabled });
      return ctx.reply({ embeds: [successEmbed(`Anti-Nuke is now **${enabled ? "enabled" : "disabled"}**.`)] });
    }

    // ── status ───────────────────────────────────────────────────────────────
    if (sub === "status") {
      const wlRows = await db.select({ userId: antinukeWhitelist.userId }).from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
      const wlList = wlRows.length ? wlRows.map(r => `<@${r.userId}>`).join(", ") : "*none*";
      return ctx.reply({ embeds: [brandEmbed({
        title: "Anti-Nuke Status",
        fields: [
          { name: "Enabled",    value: settings.antinukeEnabled ? "on" : "off",                inline: true },
          { name: "Punishment", value: `\`${settings.antinukeAction}\``,                       inline: true },
          { name: "Threshold",  value: `${settings.antinukeThreshold ?? 3} actions / 10s`,    inline: true },
          { name: "Log",        value: settings.antinukeLogChannel ? `<#${settings.antinukeLogChannel}>` : "not set", inline: true },
          { name: "Whitelist",  value: wlList.slice(0, 1024),                                  inline: false },
        ],
        page: "Anti-Nuke",
      })] });
    }

    // ── action ───────────────────────────────────────────────────────────────
    if (sub === "action") {
      const v = value.toLowerCase();
      if (!["ban", "kick", "strip"].includes(v)) return ctx.reply({ embeds: [errorEmbed("Use: `ban`, `kick`, or `strip`.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeAction: v });
      return ctx.reply({ embeds: [successEmbed(`Anti-Nuke punishment set to **${v}**.`)] });
    }

    // ── threshold ────────────────────────────────────────────────────────────
    if (sub === "threshold") {
      const n = parseInt(value);
      if (isNaN(n) || n < 2 || n > 10) return ctx.reply({ embeds: [errorEmbed("Threshold must be 2–10.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeThreshold: n } as any);
      return ctx.reply({ embeds: [successEmbed(`Threshold set to **${n}** actions per 10s.`)] });
    }

    // ── log ──────────────────────────────────────────────────────────────────
    if (sub === "log") {
      if (!logChannel && (!value || value.toLowerCase() === "off")) {
        await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: null } as any);
        return ctx.reply({ embeds: [successEmbed("Anti-Nuke log disabled.")] });
      }
      const ch = logChannel ?? ctx.guild.channels.cache.find(c => c.isTextBased() && (c.id === value.replace(/[<#>]/g, "") || (c as any).name?.includes(value.toLowerCase())));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Channel not found. Mention it directly.")] });
      await updateGuildSettings(ctx.guild.id, { antinukeLogChannel: ch.id } as any);
      return ctx.reply({ embeds: [successEmbed(`Anti-Nuke alerts → <#${ch.id}>.`)] });
    }

    // ── whitelist — ,antinuke whitelist @user toggles them ───────────────────
    if (sub === "whitelist") {
      const user = targetUser;
      if (!user) {
        const rows = await db.select({ userId: antinukeWhitelist.userId }).from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, ctx.guild.id));
        const list = rows.length ? rows.map((r, i) => `${i + 1}. <@${r.userId}>`).join("\n") : "*No whitelisted users.*";
        return ctx.reply({ embeds: [brandEmbed({ title: "Anti-Nuke Whitelist", description: list, page: "Anti-Nuke" })] });
      }
      const exists = await db.select().from(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
      if (exists.length) {
        await db.delete(antinukeWhitelist).where(and(eq(antinukeWhitelist.guildId, ctx.guild.id), eq(antinukeWhitelist.userId, user.id)));
        invalidateWhitelistCache(ctx.guild.id);
        return ctx.reply({ embeds: [successEmbed(`Removed <@${user.id}> from the whitelist.`)] });
      }
      await db.insert(antinukeWhitelist).values({ guildId: ctx.guild.id, userId: user.id }).onConflictDoNothing();
      invalidateWhitelistCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed(`Added <@${user.id}> to the whitelist.`)] });
    }

    return ctx.reply({ embeds: [brandEmbed({
      title: "Anti-Nuke",
      description: [
        "`,antinuke` — toggle on/off",
        "`,antinuke status`",
        "`,antinuke action <ban|kick|strip>`",
        "`,antinuke threshold <2-10>`",
        "`,antinuke log <#channel>`",
        "`,antinuke whitelist @user` — toggle whitelist",
      ].join("\n"),
      page: "Anti-Nuke",
    })] });
  },
};
