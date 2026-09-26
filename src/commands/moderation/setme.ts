import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "setme",
  description: "Create the jail role and jail log channel used by moderation.",
  category: "moderation",
  permission: "administrator",
  guildOnly: true,
  usage: "setme",
  examples: ["setme"],
  async execute(ctx) {
    if (!config.databaseEnabled) return ctx.reply({ embeds: [errorEmbed("setme requires the database to be enabled.")] });
    const guild = ctx.guild;
    if (!guild) return;
    let role = guild.roles.cache.find(r => r.name.toLowerCase() === "jail");
    if (!role) role = await guild.roles.create({ name: "jail", reason: "Mourn jail setup" });
    let log = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === "jail-log");
    if (!log) log = await guild.channels.create({ name: "jail-log", type: ChannelType.GuildText, permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: guild.members.me?.id ?? guild.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ], reason: "Mourn jail setup" });
    await updateGuildSettings(guild.id, { jailRole: role.id, joinLogChannel: log.id });
    return ctx.reply({ embeds: [successEmbed("jail setup complete — role <@&" + role.id + "> and log <#" + log.id + "> created.", "moderation")] });
  },
};