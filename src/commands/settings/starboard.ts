import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "starboard",
  description: "Manage the starboard. Subcommands: add, remove, list, view, selfstar, color, timestamp, jump, attachments",
  usage: "starboard <add|remove|threshold|emoji|selfstar|color|timestamp|jump|attachments> [args]",
  examples: [
    "starboard add #starboard",
    "starboard threshold 5",
    "starboard emoji ⭐",
    "starboard selfstar on",
    "starboard color #ffd700",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | threshold | emoji | selfstar | color | timestamp | jump | attachments | view", type: ApplicationCommandOptionType.String, required: true,
      choices: [
        { name: "add", value: "add" }, { name: "remove", value: "remove" },
        { name: "threshold", value: "threshold" }, { name: "emoji", value: "emoji" },
        { name: "selfstar", value: "selfstar" }, { name: "color", value: "color" },
        { name: "timestamp", value: "timestamp" }, { name: "jump", value: "jump" },
        { name: "attachments", value: "attachments" }, { name: "view", value: "view" },
      ] },
    { name: "value", description: "Channel, number, emoji, color, on/off", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Starboard channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const val = ctx.getString("value") ?? ctx.args[1] ?? "";

    if (sub === "view") {
      const s = await getGuildSettings(ctx.guild.id);
      return ctx.reply({ embeds: [brandEmbed({
        title: "Starboard",
        fields: [
          { name: "channel", value: s.starboardChannel ? `<#${s.starboardChannel}>` : "not set", inline: true },
          { name: "threshold", value: String(s.starboardThreshold), inline: true },
          { name: "emoji", value: s.starboardEmoji, inline: true },
          { name: "selfstar", value: (s as any).starboardSelfstar ? "on" : "off", inline: true },
          { name: "color", value: (s as any).starboardColor ?? "default", inline: true },
          { name: "timestamp", value: (s as any).starboardTimestamp !== false ? "on" : "off", inline: true },
          { name: "jump url", value: (s as any).starboardJump !== false ? "on" : "off", inline: true },
          { name: "attachments", value: (s as any).starboardAttachments !== false ? "on" : "off", inline: true },
        ],
      })] });
    }

    if (sub === "add" || sub === "remove") {
      if (sub === "remove") {
        await updateGuildSettings(ctx.guild.id, { starboardChannel: null });
        return ctx.reply({ embeds: [successEmbed("starboard disabled.")] });
      }
      const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(val.replace(/[<#>]/g, ""));
      if (!ch) return ctx.reply({ embeds: [errorEmbed("please provide a channel.")] });
      await updateGuildSettings(ctx.guild.id, { starboardChannel: ch.id });
      return ctx.reply({ embeds: [successEmbed(`starboard set to <#${ch.id}>.`)] });
    }

    if (sub === "threshold") {
      const n = parseInt(val);
      if (isNaN(n) || n < 1 || n > 50) return ctx.reply({ embeds: [errorEmbed("threshold must be 1–50.")] });
      await updateGuildSettings(ctx.guild.id, { starboardThreshold: n });
      return ctx.reply({ embeds: [successEmbed(`starboard threshold set to **${n}**.`)] });
    }

    if (sub === "emoji") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("please provide an emoji.")] });
      await updateGuildSettings(ctx.guild.id, { starboardEmoji: val });
      return ctx.reply({ embeds: [successEmbed(`starboard emoji set to ${val}.`)] });
    }

    if (sub === "selfstar") {
      const on = val === "on" || val === "true";
      await updateGuildSettings(ctx.guild.id, { starboardSelfstar: on } as any);
      return ctx.reply({ embeds: [successEmbed(`selfstar ${on ? "enabled" : "disabled"} — members ${on ? "can" : "cannot"} star their own messages.`)] });
    }

    if (sub === "color") {
      if (!val) return ctx.reply({ embeds: [errorEmbed("please provide a hex color.")] });
      await updateGuildSettings(ctx.guild.id, { starboardColor: val } as any);
      return ctx.reply({ embeds: [successEmbed(`starboard embed color set to \`${val}\`.`)] });
    }

    if (sub === "timestamp") {
      const on = val !== "off";
      await updateGuildSettings(ctx.guild.id, { starboardTimestamp: on } as any);
      return ctx.reply({ embeds: [successEmbed(`starboard timestamps ${on ? "enabled" : "disabled"}.`)] });
    }

    if (sub === "jump") {
      const on = val !== "off";
      await updateGuildSettings(ctx.guild.id, { starboardJump: on } as any);
      return ctx.reply({ embeds: [successEmbed(`starboard jump link ${on ? "enabled" : "disabled"}.`)] });
    }

    if (sub === "attachments") {
      const on = val !== "off";
      await updateGuildSettings(ctx.guild.id, { starboardAttachments: on } as any);
      return ctx.reply({ embeds: [successEmbed(`starboard attachments ${on ? "enabled" : "disabled"}.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("unknown subcommand.")] });
  },
};
