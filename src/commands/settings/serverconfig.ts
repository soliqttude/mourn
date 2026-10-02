import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

function ch(id: string | null | undefined): string { return id ? `<#${id}>` : "none"; }
function role(id: string | null | undefined): string { return id ? `<@&${id}>` : "none"; }
function yn(v: unknown): string { return v ? "enabled" : "disabled"; }

export const command: HybridCommand = {
  name: "serverconfig",
  aliases: ["config", "guildconfig"],
  description: "View all configured settings for this server.",
  usage: "serverconfig",
  examples: ["serverconfig"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const s = await getGuildSettings(ctx.guild.id);
    const fields = [
      { name: "prefix", value: `\`${s.prefix ?? config.defaultPrefix}\``, inline: true },
      { name: "database", value: config.databaseEnabled ? "enabled" : "disabled", inline: true },
      { name: "levels", value: yn(s.levelsEnabled), inline: true },
      { name: "welcome", value: ch(s.welcomeChannel), inline: true },
      { name: "goodbye", value: ch(s.goodbyeChannel), inline: true },
      { name: "autorole", value: role(s.autoroleId), inline: true },
      { name: "mod log", value: ch(s.modLogChannel), inline: true },
      { name: "message log", value: ch(s.msgLogChannel), inline: true },
      { name: "join log", value: ch(s.joinLogChannel), inline: true },
      { name: "voice log", value: ch(s.voiceLogChannel), inline: true },
      { name: "role log", value: ch(s.roleLogChannel), inline: true },
      { name: "server log", value: ch(s.serverLogChannel), inline: true },
      { name: "ticket category", value: ch(s.ticketCategory), inline: true },
      { name: "ticket logs", value: ch(s.ticketLogChannel), inline: true },
      { name: "voicemaster", value: ch(s.voicemasterHub), inline: true },
      { name: "counting", value: ch(s.countingChannel), inline: true },
      { name: "suggestions", value: ch(s.suggestionsChannel), inline: true },
      { name: "verification", value: ch(s.verificationChannel), inline: true },
      { name: "bump", value: ch(s.bumpChannel), inline: true },
      { name: "starboard", value: ch(s.starboardChannel), inline: true },
      { name: "clownboard", value: ch(s.clownboardChannel), inline: true },
      { name: "antinuke", value: yn(s.antinukeEnabled), inline: true },
      { name: "antiraid", value: yn(s.antiraidEnabled), inline: true },
      { name: "automod", value: yn(s.automodEnabled), inline: true },
      { name: "link filter", value: yn(s.linkFilterEnabled), inline: true },
      { name: "invite filter", value: yn(s.inviteFilterEnabled), inline: true },
      { name: "caps filter", value: yn(s.capsFilterEnabled), inline: true },
    ];
    return ctx.reply({ embeds: [brandEmbed({
      description: `**${ctx.guild.name}** server configuration`,
      thumbnail: ctx.guild.iconURL({ size: 64 }) ?? undefined,
      fields,
    })] });
  },
};
