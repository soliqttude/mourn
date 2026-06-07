import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { wordFilter, filterExempts, filterWhitelist } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

type FilterType = "caps" | "invites" | "links" | "spam" | "spoilers" | "massmention" | "emoji" | "musicfiles";

const FILTER_SETTINGS: Record<FilterType, string> = {
  caps:        "capsFilterEnabled",
  invites:     "inviteFilterEnabled",
  links:       "linkFilterEnabled",
  spam:        "automodEnabled",
  spoilers:    "spoilersFilterEnabled",
  massmention: "massMentionEnabled",
  emoji:       "emojiFilterEnabled",
  musicfiles:  "musicFilesFilterEnabled",
};

export const command: HybridCommand = {
  name: "filter",
  aliases: ["wordfilter"],
  description: "Manage word and content filters.",
  usage: "filter <add|remove|list|reset|caps|invites|links|spam|spoilers|massmention|emoji|musicfiles|regex|whitelist|snipe|wordmigrate|exempt> [args]",
  examples: [
    "filter add badword",
    "filter remove badword",
    "filter list",
    "filter caps #general on",
    "filter invites #general on",
    "filter links #general on",
    "filter spam #general on",
    "filter spoilers #general on",
    "filter emoji #general on",
    "filter musicfiles #general on",
    "filter massmention #general on",
    "filter regex ^discord\\.gg\\/",
    "filter whitelist links example.com",
    "filter exempt caps @Mods",
    "filter wordmigrate",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list | reset | caps | invites | links | spam | spoilers | massmention | emoji | musicfiles | regex | whitelist | snipe | exempt | wordmigrate", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "Word, channel, on/off, or role", type: ApplicationCommandOptionType.String, required: false },
    { name: "setting", description: "on | off", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Role for exempt", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const args = ctx.args;
    const sub = (ctx.getString("subcommand") ?? args[0] ?? "").toLowerCase();
    const val = ctx.getString("value") ?? args[1] ?? "";
    const setting = (ctx.getString("setting") ?? args[2] ?? "").toLowerCase();

    // ── Word filter CRUD ──────────────────────────────────────────────────────
    if (sub === "add") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("provide a word to filter.")] });
      await db.insert(wordFilter).values({ guildId: ctx.guild.id, word: val.toLowerCase() }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`\`${val}\` added to the word filter.`)] });
    }

    if (sub === "remove") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("provide a word to remove.")] });
      await db.delete(wordFilter).where(and(eq(wordFilter.guildId, ctx.guild.id), eq(wordFilter.word, val.toLowerCase())));
      return ctx.reply({ embeds: [successEmbed(`\`${val}\` removed from the word filter.`)] });
    }

    if (sub === "list") {
      const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      if (!words.length) return ctx.reply({ embeds: [errorEmbed("no filtered words.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Filtered Words", description: words.map(w => `\`${w.word}\``).join(", ") })] });
    }

    if (sub === "reset") {
      await db.delete(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [successEmbed("all filtered words cleared.")] });
    }

    if (sub === "regex") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("provide a regex pattern.")] });
      try { new RegExp(val); } catch { return ctx.reply({ embeds: [errorEmbed("invalid regex pattern.")] }); }
      await db.insert(filterWhitelist).values({ guildId: ctx.guild.id, filterType: "regex", value: val }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`regex pattern added: \`${val}\`.`)] });
    }

    if (sub === "whitelist") {
      // filter whitelist links example.com
      const filterType = val.toLowerCase();
      const whitelistVal = args[2] ?? ctx.getString("setting") ?? "";
      if (!filterType || !whitelistVal) return ctx.reply({ embeds: [errorEmbed("usage: filter whitelist <links|invites> <value>")] });
      await db.insert(filterWhitelist).values({ guildId: ctx.guild.id, filterType, value: whitelistVal }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`\`${whitelistVal}\` whitelisted from the **${filterType}** filter.`)] });
    }

    if (sub === "snipe") {
      // toggle what snipe shows
      const type = val || "all";
      await updateGuildSettings(ctx.guild.id, { snipeFilter: type } as any);
      return ctx.reply({ embeds: [successEmbed(`snipe filter set to **${type}**.`)] });
    }

    if (sub === "wordmigrate") {
      const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      if (!words.length) return ctx.reply({ embeds: [errorEmbed("no filtered words to migrate.")] });
      try {
        await ctx.guild.autoModerationRules.create({
          name: "bleed-word-filter",
          eventType: 1,
          triggerType: 1,
          triggerMetadata: { keywordFilter: words.map(w => w.word) },
          actions: [{ type: 1 }],
          enabled: true,
        });
        return ctx.reply({ embeds: [successEmbed(`migrated ${words.length} words to Discord AutoMod.`)] });
      } catch (e: any) {
        return ctx.reply({ embeds: [errorEmbed(`failed: ${e.message}`)] });
      }
    }

    // ── Content filter toggles ─────────────────────────────────────────────────
    const contentFilters = ["caps", "invites", "links", "spam", "spoilers", "massmention", "emoji", "musicfiles"];
    if (contentFilters.includes(sub)) {
      // Check for exempt subcommand: filter caps exempt @Role
      const nextArg = args[1]?.toLowerCase();

      if (nextArg === "exempt") {
        const isListSub = args[2]?.toLowerCase() === "list";
        if (isListSub) {
          const exempts = await db.select().from(filterExempts).where(and(eq(filterExempts.guildId, ctx.guild.id), eq(filterExempts.filterType, sub)));
          if (!exempts.length) return ctx.reply({ embeds: [errorEmbed(`no roles exempted from ${sub} filter.`)] });
          return ctx.reply({ embeds: [brandEmbed({ title: `${sub} filter exempts`, description: exempts.map(e => `<@&${e.roleId}>`).join("\n") })] });
        }
        const roleRaw = args[2] ?? "";
        const roleId = roleRaw.replace(/[<@&>]/g, "");
        if (!roleId) return ctx.reply({ embeds: [errorEmbed("please provide a role to exempt.")] });
        await db.insert(filterExempts).values({ guildId: ctx.guild.id, filterType: sub, roleId }).onConflictDoNothing();
        return ctx.reply({ embeds: [successEmbed(`<@&${roleId}> exempted from **${sub}** filter.`)] });
      }

      const on = setting === "on" || nextArg === "on";
      const settingKey = FILTER_SETTINGS[sub as FilterType];
      if (settingKey) {
        await updateGuildSettings(ctx.guild.id, { [settingKey]: on } as any);
        return ctx.reply({ embeds: [successEmbed(`**${sub}** filter ${on ? "enabled" : "disabled"}.`)] });
      }
    }

    if (sub === "exempt") {
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(val.replace(/[<@&>]/g, ""));
      if (!role) return ctx.reply({ embeds: [errorEmbed("please provide a role.")] });
      await db.insert(filterExempts).values({ guildId: ctx.guild.id, filterType: "word", roleId: role.id }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> exempted from the word filter.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("unknown subcommand.")] });
  },
};
