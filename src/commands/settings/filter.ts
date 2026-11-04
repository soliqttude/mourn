import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { wordFilter, filterExempts, filterWhitelist, filterChannelSettings, filterLinkWhitelist } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

type FilterType = "caps" | "invites" | "links" | "spam" | "spoilers" | "massmention" | "emoji" | "musicfiles";
const TYPES: FilterType[] = ["caps", "invites", "links", "spam", "spoilers", "massmention", "emoji", "musicfiles"];
const DEFAULTS: Record<FilterType, number> = { caps: 70, invites: 1, links: 1, spam: 5, spoilers: 1, massmention: 5, emoji: 10, musicfiles: 1 };

function idOf(value: string): string {
  return value.replace(/[<#@&!>]/g, "");
}

export const command: HybridCommand = {
  name: "filter",
  aliases: ["wordfilter"],
  description: "Configure word and message filters.",
  usage: "filter <add|remove|list|reset|<filter type>> [args]",
  examples: ["filter add badword", "filter links #general on", "filter massmention #general on 5", "filter links whitelist #general example.com", "filter caps exempt @Mods"],
  category: "settings",
  permission: "manage_channels",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "Filter action or type", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "Word, role, URL, or pattern", type: ApplicationCommandOptionType.String, required: false },
    { name: "setting", description: "on or off", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Exempt role", type: ApplicationCommandOptionType.Role, required: false },
    { name: "parameters", description: "Numeric threshold", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const args = ctx.args;
    const sub = (ctx.getString("subcommand") ?? args[0] ?? "").toLowerCase();
    const value = ctx.getString("value") ?? args.slice(1).join(" ");
    const setting = (ctx.getString("setting") ?? args[2] ?? "").toLowerCase();
    const channelArg = args[1] ?? "";
    const channel = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get(idOf(channelArg));
    const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(idOf(args[args[1] === "exempt" ? 2 : 1] ?? ""));

    if (!sub) {
      return ctx.reply({ embeds: [brandEmbed({
        title: "Chat Filters",
        description: [
          "**Content filters** — links, invites, caps, spoilers, mass mentions, emoji, music files and spam.",
          "**Word filters** — add, remove, list and reset filtered words.",
          "**Controls** — role exemptions, link/word whitelists, regex rules and AutoMod migration.",
          "",
          "Use `filter <type> #channel on|off [threshold]` to configure a channel.",
        ].join("\\n"),
      })] });
    }

    if (sub === "add" || sub === "remove") {
      const phrase = (ctx.source === "prefix" ? args.slice(1).join(" ") : ctx.getString("value") ?? "").trim().toLowerCase();
      if (!phrase) return ctx.reply({ embeds: [errorEmbed("Provide a word or phrase.")] });
      if (sub === "add") await db.insert(wordFilter).values({ guildId: ctx.guild.id, word: phrase }).onConflictDoNothing();
      else await db.delete(wordFilter).where(and(eq(wordFilter.guildId, ctx.guild.id), eq(wordFilter.word, phrase)));
      return ctx.reply({ embeds: [successEmbed(sub === "add" ? `\`${phrase}\` added to the word filter.` : `\`${phrase}\` removed from the word filter.`)] });
    }

    if (sub === "list") {
      const rows = await db.select().from(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [brandEmbed({ title: "Filtered Words", description: rows.length ? rows.map(row => `\`${row.word}\``).join("\\n") : "No filtered words configured." })] });
    }
    if (sub === "reset") {
      await db.delete(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [successEmbed("All legacy filtered words have been reset.")] });
    }

    if (sub === "exempt" || (TYPES.includes(sub as FilterType) && args[1]?.toLowerCase() === "exempt")) {
      const type = sub === "exempt" ? "word" : sub;
      const offset = sub === "exempt" ? 1 : 2;
      const operation = (args[offset] ?? "").toLowerCase();
      if (operation === "list" || (!role && !ctx.getRole("role"))) {
        const rows = await db.select().from(filterExempts).where(and(eq(filterExempts.guildId, ctx.guild.id), eq(filterExempts.filterType, type)));
        return ctx.reply({ embeds: [brandEmbed({ title: `${type} filter exemptions`, description: rows.length ? rows.map(row => `<@&${row.roleId}>`).join("\\n") : "No exempt roles configured." })] });
      }
      const selectedRole = ctx.getRole("role") ?? ctx.guild.roles.cache.get(idOf(args[offset] === "remove" ? args[offset + 1] ?? "" : args[offset] ?? ""));
      if (!selectedRole) return ctx.reply({ embeds: [errorEmbed("Provide a role to exempt.")] });
      const where = and(eq(filterExempts.guildId, ctx.guild.id), eq(filterExempts.filterType, type), eq(filterExempts.roleId, selectedRole.id));
      if (operation === "remove") await db.delete(filterExempts).where(where);
      else await db.insert(filterExempts).values({ guildId: ctx.guild.id, filterType: type, roleId: selectedRole.id }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(operation === "remove" ? `<@&${selectedRole.id}> removed from ${type} exemptions.` : `<@&${selectedRole.id}> exempted from ${type} filter.`)] });
    }

    if (sub === "links" && args[1]?.toLowerCase() === "whitelist") {
      const target = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get(idOf(args[2] ?? ""));
      const url = (ctx.source === "prefix" ? args.slice(3).join(" ") : ctx.getString("value") ?? "").trim().toLowerCase().replace(/^https?:\\/\\//, "").replace(/\\/$/, "");
      if (!target || !url) return ctx.reply({ embeds: [errorEmbed("Usage: filter links whitelist #channel domain-or-url")] });
      const where = and(eq(filterLinkWhitelist.guildId, ctx.guild.id), eq(filterLinkWhitelist.channelId, target.id), eq(filterLinkWhitelist.url, url));
      const existing = await db.select().from(filterLinkWhitelist).where(where);
      if (existing.length) {
        await db.delete(filterLinkWhitelist).where(where);
        return ctx.reply({ embeds: [successEmbed(`\`${url}\` removed from the link whitelist for <#${target.id}>.`)] });
      }
      await db.insert(filterLinkWhitelist).values({ guildId: ctx.guild.id, channelId: target.id, url }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`\`${url}\` whitelisted in <#${target.id}>.`)] });
    }

    if (sub === "whitelist") {
      const parts = args.slice(1);
      const kind = (parts[0] ?? "word").toLowerCase();
      const operation = (parts[1] ?? "add").toLowerCase();
      const entry = parts.slice(operation === "add" || operation === "remove" || operation === "list" ? 2 : 1).join(" ") || value;
      const filterType = ["word", "invites", "domains", "links"].includes(kind) ? kind : "word";
      if (operation === "list") {
        const rows = await db.select().from(filterWhitelist).where(and(eq(filterWhitelist.guildId, ctx.guild.id), eq(filterWhitelist.filterType, filterType)));
        return ctx.reply({ embeds: [brandEmbed({ title: `${filterType} whitelist`, description: rows.length ? rows.map(row => row.value).join("\\n") : "No entries." })] });
      }
      if (!entry) return ctx.reply({ embeds: [errorEmbed("Provide a whitelist entry.")] });
      const normalized = entry.toLowerCase().trim();
      const where = and(eq(filterWhitelist.guildId, ctx.guild.id), eq(filterWhitelist.filterType, filterType), eq(filterWhitelist.value, normalized));
      if (operation === "remove") await db.delete(filterWhitelist).where(where);
      else await db.insert(filterWhitelist).values({ guildId: ctx.guild.id, filterType, value: normalized }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`${operation === "remove" ? "Removed" : "Added"} \`${normalized}\` ${operation === "remove" ? "from" : "to"} the ${filterType} whitelist.`)] });
    }

    if (sub === "regex") {
      const pattern = (ctx.getString("value") ?? args.slice(1).join(" ")).trim();
      if (!pattern) return ctx.reply({ embeds: [errorEmbed("Provide a regex pattern.")] });
      try { new RegExp(pattern); } catch { return ctx.reply({ embeds: [errorEmbed("Invalid regular expression.")] }); }
      const where = and(eq(filterWhitelist.guildId, ctx.guild.id), eq(filterWhitelist.filterType, "regex"), eq(filterWhitelist.value, pattern));
      const existing = await db.select().from(filterWhitelist).where(where);
      if (existing.length) {
        await db.delete(filterWhitelist).where(where);
        return ctx.reply({ embeds: [successEmbed("Regex pattern removed.")] });
      }
      await db.insert(filterWhitelist).values({ guildId: ctx.guild.id, filterType: "regex", value: pattern }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed("Regex pattern added.")] });
    }

    if (sub === "snipe") {
      const type = (ctx.getString("value") ?? args[1] ?? "all").toLowerCase();
      await updateGuildSettings(ctx.guild.id, { snipeFilter: type } as any);
      return ctx.reply({ embeds: [successEmbed(`Snipe filter set to **${type}**.`)] });
    }

    if (sub === "wordmigrate") {
      const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      if (!words.length) return ctx.reply({ embeds: [errorEmbed("No filtered words to migrate.")] });
      try {
        await ctx.guild.autoModerationRules.create({
          name: "villain-word-filter", eventType: 1, triggerType: 1,
          triggerMetadata: { keywordFilter: words.map(row => row.word) },
          actions: [{ type: 1 }], enabled: true,
        });
        return ctx.reply({ embeds: [successEmbed(`Migrated ${words.length} filtered words to Discord AutoMod.`)] });
      } catch (error: any) {
        return ctx.reply({ embeds: [errorEmbed(`AutoMod migration failed: ${error.message}`)] });
      }
    }

    if (TYPES.includes(sub as FilterType)) {
      const type = sub as FilterType;
      const action = (args[1] ?? "").toLowerCase();
      if (action === "whitelist" && type === "links") return ctx.reply({ embeds: [errorEmbed("Usage: filter links whitelist #channel domain-or-url")] });
      const isOn = setting === "on" || action === "on";
      const isOff = setting === "off" || action === "off";
      if (!isOn && !isOff) return ctx.reply({ embeds: [errorEmbed(`Usage: filter ${type} #channel on|off [threshold]`)] });
      if (!channel) return ctx.reply({ embeds: [errorEmbed("Provide a channel for this filter.")] });
      const rawThreshold = ctx.getNumber("parameters") ?? Number(args[3]);
      const threshold = Number.isFinite(rawThreshold) && rawThreshold > 0 ? Math.min(1000, Math.floor(rawThreshold)) : DEFAULTS[type];
      await db.insert(filterChannelSettings).values({
        guildId: ctx.guild.id, channelId: channel.id, filterType: type, enabled: isOn, threshold,
      }).onConflictDoUpdate({
        target: [filterChannelSettings.guildId, filterChannelSettings.channelId, filterChannelSettings.filterType],
        set: { enabled: isOn, threshold },
      });
      return ctx.reply({ embeds: [successEmbed(`${type} filter ${isOn ? "enabled" : "disabled"} in <#${channel.id}> (threshold: ${threshold}).`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown filter option.")] });
  },
};
