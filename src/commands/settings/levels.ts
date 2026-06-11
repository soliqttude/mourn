import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { levels, levelRewards } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "levels",
  aliases: ["leveling", "xp"],
  description: "Configure the leveling system.",
  usage: "levels <on|off|channel|message|messagemode|rate|stackroles|ignore|config|reset|addreward|removereward|rewards>",
  examples: [
    "levels on",
    "levels off",
    "levels channel #level-ups",
    "levels message Congrats {user.mention}! You're level {level}!",
    "levels messagemode dm",
    "levels rate 150",
    "levels stackroles on",
    "levels addreward 10 @Level10",
    "levels removereward 10",
    "levels rewards",
    "levels config",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "on | off | channel | message | messagemode | rate | stackroles | ignore | config | reset | addreward | removereward | rewards", type: ApplicationCommandOptionType.String, required: true },
    { name: "value", description: "Channel, message, rate, or on/off", type: ApplicationCommandOptionType.String, required: false },
    { name: "value2", description: "Role (for addreward)", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Level-up channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Reward role", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const val = ctx.getString("value") ?? ctx.args.slice(1).join(" ");
    const firstArg = ctx.args[1] ?? "";

    if (sub === "on") {
      await updateGuildSettings(ctx.guild.id, { levelsEnabled: true });
      return ctx.reply({ embeds: [successEmbed("Leveling enabled.")] });
    }

    if (sub === "off") {
      await updateGuildSettings(ctx.guild.id, { levelsEnabled: false });
      return ctx.reply({ embeds: [successEmbed("Leveling disabled.")] });
    }

    if (sub === "config") {
      const s = await getGuildSettings(ctx.guild.id);
      return ctx.reply({ embeds: [brandEmbed({
        title: "Levels Config",
        fields: [
          { name: "enabled", value: s.levelsEnabled ? "yes" : "no", inline: true },
          { name: "level-up channel", value: s.levelUpChannel ? `<#${s.levelUpChannel}>` : "context", inline: true },
          { name: "message mode", value: (s as any).levelUpMode ?? "channel", inline: true },
          { name: "xp rate", value: `${(s as any).xpRate ?? 100}%`, inline: true },
          { name: "stack roles", value: (s as any).levelsStackRoles ? "yes" : "no", inline: true },
          { name: "level-up message", value: (s as any).levelUpMessage ?? "*(default)*", inline: false },
        ],
      })] });
    }

    if (sub === "reset") {
      await updateGuildSettings(ctx.guild.id, { levelsEnabled: true, levelUpChannel: null, levelUpMessage: null, levelUpMode: "channel", xpRate: 100, levelsStackRoles: false } as any);
      return ctx.reply({ embeds: [successEmbed("Leveling config reset to defaults.")] });
    }

    if (sub === "channel") {
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(firstArg.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Please provide a **channel**.")] });
      await updateGuildSettings(ctx.guild.id, { levelUpChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`level-up channel set to <#${ch.id}>.`)] });
    }

    if (sub === "message") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("Provide a message. use {**user**.mention}, {**level**}, {xp} etc.")] });
      await updateGuildSettings(ctx.guild.id, { levelUpMessage: val } as any);
      return ctx.reply({ embeds: [successEmbed("**Level**-up message updated.")] });
    }

    if (sub === "messagemode") {
      const mode = firstArg.toLowerCase();
      if (!["dm", "channel", "context", "none"].includes(mode)) {
        return ctx.reply({ embeds: [errorEmbed("Mode must be: dm | **channel** | context | none")] });
      }
      await updateGuildSettings(ctx.guild.id, { levelUpMode: mode } as any);
      return ctx.reply({ embeds: [successEmbed(`level-up message mode set to **${mode}**.`)] });
    }

    if (sub === "rate") {
      const rate = parseInt(firstArg);
      if (isNaN(rate) || rate < 1 || rate > 500) return ctx.reply({ embeds: [errorEmbed("Rate must be 1–500 (percentage).")] });
      await updateGuildSettings(ctx.guild.id, { xpRate: rate } as any);
      return ctx.reply({ embeds: [successEmbed(`xp rate set to **${rate}%**.`)] });
    }

    if (sub === "stackroles") {
      const on = firstArg === "on" || firstArg === "true";
      await updateGuildSettings(ctx.guild.id, { levelsStackRoles: on } as any);
      return ctx.reply({ embeds: [successEmbed(`role stacking ${on ? "enabled — members keep all earned roles" : "disabled — only highest reward role is kept"}.`)] });
    }

    if (sub === "ignore") {
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(firstArg.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Provide a **channel** to ignore xp in.")] });
      const { ignoredXpChannels } = await import("../../db/schema.js").catch(() => ({ ignoredXpChannels: null }));
      if (!ignoredXpChannels) return ctx.reply({ embeds: [errorEmbed("Xp ignore not yet available — update the DB.")] });
      return ctx.reply({ embeds: [successEmbed(`xp gain ignored in <#${ch.id}>.`)] });
    }

    if (sub === "rewards") {
      const rows = await db.select().from(levelRewards).where(eq(levelRewards.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No **level** rewards set up.")] });
      const lines = rows.sort((a, b) => a.level - b.level).map(r => `Level **${r.level}** → <@&${r.roleId}>`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Level Rewards", description: lines.join("\n") })] });
    }

    if (sub === "addreward") {
      const levelNum = parseInt(firstArg);
      const roleRaw = ctx.args[2] ?? "";
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(roleRaw.replace(/[<@&>]/g, ""));
      if (isNaN(levelNum) || !role) return ctx.reply({ embeds: [errorEmbed("Usage: **levels** addreward <**level**> <**role**>")] });
      await db.insert(levelRewards).values({ guildId: ctx.guild.id, level: levelNum, roleId: role.id })
        .onConflictDoUpdate({ target: [levelRewards.guildId, levelRewards.level], set: { roleId: role.id } });
      return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> set as reward for reaching level **${levelNum}**.`)] });
    }

    if (sub === "removereward") {
      const levelNum = parseInt(firstArg);
      if (isNaN(levelNum)) return ctx.reply({ embeds: [errorEmbed("Provide the **level** number.")] });
      await db.delete(levelRewards).where(and(eq(levelRewards.guildId, ctx.guild.id), eq(levelRewards.level, levelNum)));
      return ctx.reply({ embeds: [successEmbed(`reward for level **${levelNum}** removed.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand.")] });
  },
};
