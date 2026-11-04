import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings, getGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { brandEmbed } from "../../lib/embeds.js";
import { musicSettings } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { config } from "../../config.js";

function ch(id: string | null | undefined): string { return id ? `<#${id}>` : "none"; }
function role(id: string | null | undefined): string { return id ? `<@&${id}>` : "none"; }
function yn(v: unknown): string { return v ? "enabled" : "disabled"; }

export const command: HybridCommand = {
  name: "settings",
  aliases: ["serverconfig", "config", "guildconfig"],
  description: "View all configured settings for this server.",
  usage: "settings [config|modlog|joinlogs|staff|dj|autoplay|jailmsg|jailrole|muted|resetcases|reset]",
  examples: ["settings config", "settings modlog #mod-log", "settings joinlogs #joins", "settings jailrole @Jailed", "settings resetcases"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "action", description: "Setting to view or update", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Target role", type: ApplicationCommandOptionType.Role, required: false },
    { name: "value", description: "Message or setting value", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "config").toLowerCase();
    const member = ctx.member as any;
    if (action !== "config" && action !== "resetcases" && action !== "reset" && !member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ embeds: [errorEmbed("You need Manage Server to change settings.")] });
    }
    if (action === "jailmsg") {
      const message = ctx.getString("value") ?? ctx.args.slice(1).join(" ");
      if (!message) return ctx.reply({ embeds: [errorEmbed("Provide the custom jail message text.")] });
      await updateGuildSettings(ctx.guild.id, { jailMessage: message } as any);
      return ctx.reply({ embeds: [successEmbed("Custom jail message updated.")] });
    }
    if (action === "modlog" || action === "joinlogs") {
      const channel = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get((ctx.args[1] ?? "").replace(/[<#>]/g, ""));
      if (!channel) return ctx.reply({ embeds: [errorEmbed("Provide a target channel.")] });
      await updateGuildSettings(ctx.guild.id, action === "modlog" ? { modLogChannel: channel.id } : { joinLogChannel: channel.id });
      return ctx.reply({ embeds: [successEmbed(action + " channel set to <#" + channel.id + ">.")] });
    }
    if (action === "dj" || action === "autoplay") {
      const [music] = await db.select().from(musicSettings).where(eq(musicSettings.guildId, ctx.guild.id));
      if (action === "dj") {
        const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
        if (!role) return ctx.reply({ embeds: [errorEmbed("Provide the DJ role.")] });
        await db.insert(musicSettings).values({ guildId: ctx.guild.id, djRoleId: role.id, autoplay: music?.autoplay ?? false })
          .onConflictDoUpdate({ target: musicSettings.guildId, set: { djRoleId: role.id } });
        return ctx.reply({ embeds: [successEmbed(`DJ role set to <@&${role.id}>.`)] });
      }
      const value = (ctx.args[1] ?? ctx.getString("value") ?? "").toLowerCase();
      if (!["on", "off", "true", "false"].includes(value)) return ctx.reply({ embeds: [errorEmbed("Use settings autoplay on or settings autoplay off.")] });
      const enabled = value === "on" || value === "true";
      await db.insert(musicSettings).values({ guildId: ctx.guild.id, djRoleId: music?.djRoleId ?? null, autoplay: enabled })
        .onConflictDoUpdate({ target: musicSettings.guildId, set: { autoplay: enabled } });
      return ctx.reply({ embeds: [successEmbed(`music autoplay ${enabled ? "enabled" : "disabled"}.`)] });
    }
    if (action === "staff") {
      const settings = await getGuildSettings(ctx.guild.id);
      const roles = [...((settings as any).staffRoleIds ?? [])] as string[];
      const sub = (ctx.args[1] ?? "").toLowerCase();
      if (sub === "list") return ctx.reply({ embeds: [brandEmbed({ title: "Staff roles", description: roles.length ? roles.map(id => `<@&${id}>`).join("\n") : "No staff roles configured." })] });
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
      if (!role) return ctx.reply({ embeds: [errorEmbed("Provide a role, or use staff list.")] });
      const updated = roles.includes(role.id) ? roles.filter(id => id !== role.id) : [...roles, role.id];
      await updateGuildSettings(ctx.guild.id, { staffRoleIds: updated } as any);
      return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> ${updated.includes(role.id) ? "added to" : "removed from"} the staff role list.`)] });
    }
    if (action === "jailrole" || action === "muted") {
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
      if (!role) return ctx.reply({ embeds: [errorEmbed("Provide a target role.")] });
      const key = action === "jailrole" ? "jailRole" : "muteRole";
      await updateGuildSettings(ctx.guild.id, { [key]: role.id } as any);
      return ctx.reply({ embeds: [successEmbed(action + " role set to <@&" + role.id + ">.")] });
    }
    if (action === "resetcases") {
      if (!member?.permissions?.has(PermissionFlagsBits.Administrator)) return ctx.reply({ embeds: [errorEmbed("You need Administrator to reset jail-log cases.")] });
      return ctx.reply({ embeds: [errorEmbed("This server does not currently store the jail-log case records required for this action; no records were changed.")] });
    }
    if (action === "reset") {
      if (!member?.permissions?.has(PermissionFlagsBits.Administrator)) return ctx.reply({ embeds: [errorEmbed("You need Administrator to reset moderation settings.")] });
      await updateGuildSettings(ctx.guild.id, { jailRole: null, muteRole: null, modLogChannel: null, automodEnabled: false, linkFilterEnabled: false, inviteFilterEnabled: false, capsFilterEnabled: false, spoilersFilterEnabled: false, massMentionEnabled: false, emojiFilterEnabled: false, musicFilesFilterEnabled: false } as any);
      return ctx.reply({ embeds: [successEmbed("Moderation roles, log channel, and built-in content-filter toggles have been reset.")] });
    }
    if (action !== "config") return ctx.reply({ embeds: [errorEmbed("That settings action is not implemented yet.")] });
    const s = await getGuildSettings(ctx.guild.id);
    const autoroleDisplay = String(s.autoroleId ?? "").split(",").filter(Boolean).map(role).join(", ") || "none";
    const fields = [
      { name: "prefix", value: `\`${s.prefix ?? config.defaultPrefix}\``, inline: true },
      { name: "database", value: config.databaseEnabled ? "enabled" : "disabled", inline: true },
      { name: "levels", value: yn(s.levelsEnabled), inline: true },
      { name: "welcome", value: ch(s.welcomeChannel), inline: true },
      { name: "goodbye", value: ch(s.goodbyeChannel), inline: true },
      { name: "autoroles", value: autoroleDisplay, inline: true },
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
