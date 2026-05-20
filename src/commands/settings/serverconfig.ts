import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";

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
  permission: "mod",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const s = await getGuildSettings(ctx.guild.id);
    const a = s as any;

    const fields = [
      { name: "prefix",        value: `\`${s.prefix ?? ","}\``,         inline: true },
      { name: "mod role",      value: role(s.modRoleId),                 inline: true },
      { name: "admin role",    value: role(s.adminRoleId),               inline: true },
      { name: "welcome",       value: ch(s.welcomeChannel),              inline: true },
      { name: "goodbye",       value: ch(s.goodbyeChannel),              inline: true },
      { name: "autorole",      value: role(s.autoroleId),                inline: true },
      { name: "mod log",       value: ch(s.modLogChannel),               inline: true },
      { name: "message log",   value: ch(s.msgLogChannel),               inline: true },
      { name: "join log",      value: ch(s.joinLogChannel),              inline: true },
      { name: "voice log",     value: ch(s.voiceLogChannel),             inline: true },
      { name: "counting",      value: ch(s.countingChannel),             inline: true },
      { name: "voicemaster",   value: ch(s.voicemasterHub),              inline: true },
      { name: "antilink",      value: yn(a.antilinkEnabled),             inline: true },
      { name: "antiinvite",    value: yn(a.antiinviteEnabled),           inline: true },
      { name: "antiraid",      value: yn(a.antiraidEnabled),             inline: true },
    ];

    return ctx.reply({
      embeds: [
        brandEmbed({
          description: `**${ctx.guild.name}** server configuration`,
          thumbnail: ctx.guild.iconURL({ size: 64 }) ?? undefined,
          fields,
        }),
      ],
    });
  },
};
