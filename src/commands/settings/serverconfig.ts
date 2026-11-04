import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings, getGuildSettings } from "../../db/settings.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getMusicSettings, setMusicSettings } from "../../features/music.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { boosterRoleConfig } from "../../db/schema.js";

function ch(id: string | null | undefined): string { return id ? `<#${id}>` : "none"; }
function role(id: string | null | undefined): string { return id ? `<@&${id}>` : "none"; }
function yn(v: unknown): string { return v ? "enabled" : "disabled"; }

export const command: HybridCommand = {
  name: "settings",
  aliases: ["serverconfig", "config", "guildconfig"],
  description: "View all configured settings for this server.",
  usage: "settings [config|modlog|joinlogs|staff|dj|autoplay|autonick|baserole|jail|jailmsg|jailroles|jailrole|muted|rmuted|imuted|googlesafetylevel|disablecustomfms|premiumrole|resetcases|reset]",
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
    if (action === "autonick") {
      const nickname = ctx.getString("value") ?? ctx.args.slice(1).join(" ");
      if (!nickname) return ctx.reply({ embeds: [errorEmbed("Provide a nickname template, or use settings autonick off to clear it.")] });
      if (["off", "none", "reset"].includes(nickname.toLowerCase())) {
        await updateGuildSettings(ctx.guild.id, { autoNick: null } as any);
        return ctx.reply({ embeds: [successEmbed("Automatic join nickname disabled.")] });
      }
      if (nickname.length > 32) return ctx.reply({ embeds: [errorEmbed("Discord nicknames cannot exceed 32 characters.")] });
      await updateGuildSettings(ctx.guild.id, { autoNick: nickname } as any);
      return ctx.reply({ embeds: [successEmbed("Automatic join nickname set. Use {username} or {displayname} as placeholders.")] });
    }
    if (action === "premiumrole") {
      const raw = ctx.args[1] ?? ctx.getString("value") ?? "";
      if (["off", "none", "reset", "remove"].includes(raw.toLowerCase())) {
        await updateGuildSettings(ctx.guild.id, { premiumRole: null } as any);
        return ctx.reply({ embeds: [successEmbed("Premium subscription role cleared.")] });
      }
      const premiumRole = ctx.getRole("role") ?? ctx.guild.roles.cache.get(raw.replace(/[<@&>]/g, ""));
      if (!premiumRole || premiumRole.id === ctx.guild.id) {
        return ctx.reply({ embeds: [errorEmbed("Provide a valid premium-member role, or use `settings premiumrole off` to clear it.")] });
      }
      await updateGuildSettings(ctx.guild.id, { premiumRole: premiumRole.id } as any);
      return ctx.reply({ embeds: [successEmbed(`Premium subscription role set to <@&${premiumRole.id}>. Discord manages subscription membership; this setting records the role for Villain features.`)] });
    }
    if (action === "baserole") {
      const baseRole = ctx.getRole("role") ?? ctx.guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
      if (!baseRole) return ctx.reply({ embeds: [errorEmbed("Provide the base role for booster roles.")] });
      await db.insert(boosterRoleConfig).values({ guildId: ctx.guild.id, baseRoleId: baseRole.id })
        .onConflictDoUpdate({ target: boosterRoleConfig.guildId, set: { baseRoleId: baseRole.id } });
      return ctx.reply({ embeds: [successEmbed(`Booster role base position set to <@&${baseRole.id}>.`)] });
    }
    if (action === "jail") {
      const channel = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get((ctx.args[1] ?? "").replace(/[<#>]/g, ""));
      if (!channel?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Provide a text channel for jail notifications.")] });
      await updateGuildSettings(ctx.guild.id, { jailChannel: channel.id } as any);
      return ctx.reply({ embeds: [successEmbed("Jail notification channel set to <#" + channel.id + ">.")] });
    }
    if (action === "jailroles") {
      const value = (ctx.args[1] ?? ctx.getString("value") ?? "").toLowerCase();
      if (!["yes", "no", "on", "off"].includes(value)) return ctx.reply({ embeds: [errorEmbed("Use settings jailroles yes or settings jailroles no.")] });
      const enabled = value === "yes" || value === "on";
      await updateGuildSettings(ctx.guild.id, { jailRemoveRoles: enabled } as any);
      return ctx.reply({ embeds: [successEmbed(`Role removal during jail has been ${enabled ? "enabled" : "disabled"}.`)] });
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
      const music = await getMusicSettings(ctx.guild.id);
      if (action === "dj") {
        const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
        if (!role) return ctx.reply({ embeds: [errorEmbed("Provide the DJ role.")] });
        await setMusicSettings(ctx.guild.id, { djRoleId: role.id });
        return ctx.reply({ embeds: [successEmbed(`DJ role set to <@&${role.id}>.`)] });
      }
      const value = (ctx.args[1] ?? ctx.getString("value") ?? "").toLowerCase();
      if (!["on", "off", "true", "false"].includes(value)) return ctx.reply({ embeds: [errorEmbed("Use settings autoplay on or settings autoplay off.")] });
      const enabled = value === "on" || value === "true";
      await setMusicSettings(ctx.guild.id, { autoplay: enabled });
      return ctx.reply({ embeds: [successEmbed(`music autoplay ${enabled ? "enabled" : "disabled"}.`)] });
    }
    if (action === "staff") {
      const settings = await getGuildSettings(ctx.guild.id);
      const roles = [...((settings as any).staffRoleIds ?? [])] as string[];
      const sub = (ctx.args[1] ?? ctx.getString("value") ?? "").toLowerCase();
      if (sub === "list") return ctx.reply({ embeds: [brandEmbed({ title: "Staff roles", description: roles.length ? roles.map(id => `<@&${id}>`).join("\n") : "No staff roles configured." })] });
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
      if (!role) return ctx.reply({ embeds: [errorEmbed("Provide a role, or use staff list.")] });
      const updated = roles.includes(role.id) ? roles.filter(id => id !== role.id) : [...roles, role.id];
      await updateGuildSettings(ctx.guild.id, { staffRoleIds: updated } as any);
      return ctx.reply({ embeds: [successEmbed(`<@&${role.id}> ${updated.includes(role.id) ? "added to" : "removed from"} the staff role list.`)] });
    }
    if (action === "rmuted" || action === "imuted") {
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
      if (!role) return ctx.reply({ embeds: [errorEmbed("Provide a mute role.")] });
      await updateGuildSettings(ctx.guild.id, action === "rmuted" ? { reactionMuteRole: role.id } as any : { imageMuteRole: role.id } as any);
      const permissionPatch = action === "rmuted" ? { AddReactions: false, UseExternalEmojis: false } : { AttachFiles: false, EmbedLinks: false };
      let updatedChannels = 0;
      for (const channel of ctx.guild.channels.cache.values()) {
        if (!channel.isTextBased()) continue;
        const ok = await (channel as any).permissionOverwrites.edit(role, permissionPatch).then(() => true).catch(() => false);
        if (ok) updatedChannels++;
      }
      return ctx.reply({ embeds: [successEmbed(`${action === "rmuted" ? "Reaction" : "Image"} mute role set to <@&${role.id}> and applied to ${updatedChannels} text channels.`)] });
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
      await updateGuildSettings(ctx.guild.id, { jailRole: null, jailChannel: null, jailMessage: null, premiumRole: null, jailRemoveRoles: false, muteRole: null, imageMuteRole: null, reactionMuteRole: null, modLogChannel: null, automodEnabled: false, linkFilterEnabled: false, inviteFilterEnabled: false, capsFilterEnabled: false, spoilersFilterEnabled: false, massMentionEnabled: false, emojiFilterEnabled: false, musicFilesFilterEnabled: false } as any);
      return ctx.reply({ embeds: [successEmbed("Moderation roles, log channel, and built-in content-filter toggles have been reset.")] });
    }
    if (action !== "config") return ctx.reply({ embeds: [errorEmbed("That settings action is not implemented yet.")] });
    const s = await getGuildSettings(ctx.guild.id);
    const autoroleDisplay = String(s.autoroleId ?? "").split(",").filter(Boolean).map(role).join(", ") || "none";
    const fields = [
      { name: "prefix", value: `\`${s.prefix ?? config.defaultPrefix}\``, inline: true },
      { name: "database", value: config.databaseEnabled ? "enabled" : "disabled", inline: true },
      { name: "levels", value: yn(s.levelsEnabled), inline: true },
      { name: "premium role", value: role((s as any).premiumRole), inline: true },
      { name: "welcome", value: ch(s.welcomeChannel), inline: true },
      { name: "goodbye", value: ch(s.goodbyeChannel), inline: true },
      { name: "autoroles", value: autoroleDisplay, inline: true },
      { name: "mod log", value: ch(s.modLogChannel), inline: true },
      { name: "jail channel", value: ch((s as any).jailChannel), inline: true },
      { name: "jail role", value: role(s.jailRole), inline: true },
      { name: "jail removes roles", value: yn((s as any).jailRemoveRoles), inline: true },
      { name: "mute role", value: role(s.muteRole), inline: true },
      { name: "image mute role", value: role((s as any).imageMuteRole), inline: true },
      { name: "reaction mute role", value: role((s as any).reactionMuteRole), inline: true },
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
