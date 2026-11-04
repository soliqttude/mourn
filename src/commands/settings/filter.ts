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
  permission: "manage_guild",
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
      const phrase = (ctx.getString("value") ?? args.slice(1).join(" ")).trim().toLowerCase();
      if (!phrase) return ctx.reply({ embeds: [errorEmbed("Provide a **word or phrase** to **filter**.")] });
      await db.insert(wordFilter).values({ guildId: ctx.guild.id, word: phrase }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`\`${phrase}\` added to the word filter.`)] });
    }

    if (sub === "remove") {
      const phrase = (ctx.getString("value") ?? args.slice(1).join(" ")).trim().toLowerCase();
      if (!phrase) return ctx.reply({ embeds: [errorEmbed("Provide a **word or phrase** to remove.")] });
      await db.delete(wordFilter).where(and(eq(wordFilter.guildId, ctx.guild.id), eq(wordFilter.word, phrase)));
      return ctx.reply({ embeds: [successEmbed(`\`${phrase}\` removed from the word filter.`)] });
    }

    if (sub === "list") {
      const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      if (!words.length) return ctx.reply({ embeds: [errorEmbed("No filtered **words**.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Filtered Words", description: words.map(w => `\`${w.word}\``).join(", ") })] });
    }

    if (sub === "reset") {
      await db.delete(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [successEmbed("All filtered **words** cleared.")] });
    }

    if (sub === "regex") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("Provide a regex pattern.")] });
      try { new RegExp(val); } catch { return ctx.reply({ embeds: [errorEmbed("Invalid regex pattern.")] }); }
      const existing = await db.select().from(filterWhitelist).where(and(
        eq(filterWhitelist.guildId, ctx.guild.id), eq(filterWhitelist.filterType, "regex"), eq(filterWhitelist.value, val)
      ));
      if (existing.length) {
        await db.delete(filterWhitelist).where(and(eq(filterWhitelist.guildId, ctx.guild.id), eq(filterWhitelist.filterType, "regex"), eq(filterWhitelist.value, val)));
        return ctx.reply({ embeds: [successEmbed(`regex pattern removed: \`${val}\`.`)] });
      }
      await db.insert(filterWhitelist).values({ guildId: ctx.guild.id, filterType: "regex", value: val }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`regex pattern added: \`${val}\`.`)] });
    }

    // Whitelist management: filter whitelist <type> [add|remove|list] <value>.
    // The shorthand "filter whitelist <type> <value>" adds the entry.
    if (sub === "whitelist" || (sub === "links" && args[1]?.toLowerCase() === "whitelist")) {
      const parts = sub === "whitelist" ? args.slice(1) : args.slice(2);
      const optionValue = ctx.getString("setting") ?? "";
      const knownTypes = new Set(["word", "links", "invites", "domains", "regex"]);
      let filterType = "word";
      let operation = "toggle";
      let entry = "";

      if (sub === "links") {
        filterType = "links";
        operation = (parts[0] ?? "").toLowerCase();
        entry = parts.slice(1).join(" ");
      } else {
        if (knownTypes.has((parts[0] ?? "").toLowerCase())) {
          filterType = parts.shift()!.toLowerCase();
        }
        if (["add", "remove", "list"].includes((parts[0] ?? "").toLowerCase())) {
          operation = parts.shift()!.toLowerCase();
        }
        entry = parts.join(" ");
      }
      if (!entry && optionValue && operation !== "list") entry = optionValue;
      if (operation === "list") {
        const rows = await db.select().from(filterWhitelist).where(and(
          eq(filterWhitelist.guildId, ctx.guild.id), eq(filterWhitelist.filterType, filterType)
        ));
        return ctx.reply({ embeds: [brandEmbed({
          title: `${filterType} whitelist`,
          description: rows.length ? rows.map(row => `\`${row.value}\``).join("\\n") : "No whitelist entries configured."
        })] });
      }
      if (!entry.trim()) {
        return ctx.reply({ embeds: [errorEmbed(`Usage: filter whitelist [word|links|invites|domains] [add|remove] <value>`)] });
      }
      const value = entry.trim().toLowerCase();
      const where = and(
        eq(filterWhitelist.guildId, ctx.guild.id),
        eq(filterWhitelist.filterType, filterType),
        eq(filterWhitelist.value, value)
      );
      if (operation === "remove") {
        await db.delete(filterWhitelist).where(where);
        return ctx.reply({ embeds: [successEmbed(`\`${value}\` removed from the ${filterType} whitelist.`)] });
      }
      const existing = await db.select().from(filterWhitelist).where(where);
      if (operation === "toggle" && existing.length) {
        await db.delete(filterWhitelist).where(where);
        return ctx.reply({ embeds: [successEmbed(`\`${value}\` removed from the ${filterType} whitelist.`)] });
      }
      await db.insert(filterWhitelist).values({ guildId: ctx.guild.id, filterType, value }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`\`${value}\` added to the ${filterType} whitelist.`)] });
    }

    if (sub === "exempt" && ["list", "remove"].includes((args[1] ?? "").toLowerCase())) {
      const operation = args[1].toLowerCase();
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((args[2] ?? "").replace(/[<@&>]/g, ""));
      if (operation === "remove" && role) {
        await db.delete(filterExempts).where(and(
          eq(filterExempts.guildId, ctx.guild.id), eq(filterExempts.filterType, "word"), eq(filterExempts.roleId, role.id)
        ));
        return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> removed from word-filter exemptions.`)] });
      }
      if (operation === "remove" && !role) return ctx.reply({ embeds: [errorEmbed("Provide a role to remove from exemptions.")] });
      const exempts = await db.select().from(filterExempts).where(and(
        eq(filterExempts.guildId, ctx.guild.id), eq(filterExempts.filterType, "word")
      ));
      return ctx.reply({ embeds: [brandEmbed({ title: "Word filter exemptions", description: exempts.length ? exempts.map(e => `<@&${e.roleId}>`).join("\n") : "No exempt roles configured." })] });
    }

    if (sub === "snipe") {
      // toggle what snipe shows
      const type = val || "all";
      await updateGuildSettings(ctx.guild.id, { snipeFilter: type } as any);
      return ctx.reply({ embeds: [successEmbed(`snipe filter set to **${type}**.`)] });
    }

    if (sub === "wordmigrate") {
      const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
      if (!words.length) return ctx.reply({ embeds: [errorEmbed("No filtered **words** to migrate.")] });
      try {
        await ctx.guild.autoModerationRules.create({
          name: "villain-word-filter",
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
        const operation = (args[2] ?? "").toLowerCase();
        if (operation === "list") {
          const exempts = await db.select().from(filterExempts).where(and(eq(filterExempts.guildId, ctx.guild.id), eq(filterExempts.filterType, sub)));
          return ctx.reply({ embeds: [brandEmbed({ title: `${sub} filter exemptions`, description: exempts.length ? exempts.map(e => `<@&${e.roleId}>`).join("\n") : "No exempt roles configured." })] });
        }
        const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((args[operation === "remove" ? 3 : 2] ?? "").replace(/[<@&>]/g, ""));
        if (!role) return ctx.reply({ embeds: [errorEmbed("Please provide a role to exempt or remove.")] });
        const where = and(eq(filterExempts.guildId, ctx.guild.id), eq(filterExempts.filterType, sub), eq(filterExempts.roleId, role.id));
        if (operation === "remove") {
          await db.delete(filterExempts).where(where);
          return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> removed from **${sub}** filter exemptions.`)] });
        }
        await db.insert(filterExempts).values({ guildId: ctx.guild.id, filterType: sub, roleId: role.id }).onConflictDoNothing();
        return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> exempted from **${sub}** filter.`)] });
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
      if (!role) return ctx.reply({ embeds: [errorEmbed("Please provide a **role**.")] });
      await db.insert(filterExempts).values({ guildId: ctx.guild.id, filterType: "word", roleId: role.id }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> exempted from the word filter.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand.")] });
  },
};
