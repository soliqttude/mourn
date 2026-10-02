import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "settings",
  description: "View current server settings.",
  category: "settings",
  aliases: ["serverconfig", "guildconfig"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const s = await getGuildSettings(ctx.guild.id);
    const mention = (id: string | null | undefined, kind: "channel" | "role") => {
      if (!id) return "Not set";
      return kind === "channel" ? "<#" + id + ">" : "<@&" + id + ">";
    };
    return ctx.reply({ embeds: [new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle("⚙️ " + ctx.guild.name + " Settings")
      .addFields(
        { name: "Prefix", value: s.prefix || config.defaultPrefix, inline: true },
        { name: "Welcome", value: mention(s.welcomeChannel, "channel"), inline: true },
        { name: "Goodbye", value: mention(s.goodbyeChannel, "channel"), inline: true },
        { name: "Mod logs", value: mention(s.modLogChannel, "channel"), inline: true },
        { name: "Message logs", value: mention(s.msgLogChannel, "channel"), inline: true },
        { name: "Join logs", value: mention(s.joinLogChannel, "channel"), inline: true },
        { name: "Mute role", value: mention(s.muteRole, "role"), inline: true },
        { name: "Jail role", value: mention(s.jailRole, "role"), inline: true },
        { name: "Auto role", value: mention(s.autoroleId, "role"), inline: true },
        { name: "Antinuke", value: s.antinukeEnabled ? "Enabled · " + s.antinukeAction + " / " + s.antinukeThreshold : "Disabled", inline: true },
        { name: "Antiraid", value: s.antiraidEnabled ? "Enabled · " + s.antiraidAction + " / " + s.antiraidThreshold : "Disabled", inline: true },
        { name: "Levels", value: s.levelsEnabled ? "Enabled" : "Disabled", inline: true },
        { name: "Starboard", value: mention(s.starboardChannel, "channel"), inline: true },
        { name: "VoiceMaster", value: mention(s.voicemasterHub, "channel"), inline: true },
        { name: "Tickets", value: mention(s.ticketCategory, "channel"), inline: true },
        { name: "Ticket support", value: mention(s.ticketSupportRole, "role"), inline: true },
        { name: "Ticket logs", value: mention(s.ticketLogChannel, "channel"), inline: true },
      )
      .setFooter({ text: config.embedFooter })
      .setTimestamp()] }); { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "settings",
  description: "View current server settings.",
  category: "settings",
  aliases: ["serverconfig", "guildconfig"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const s = await getGuildSettings(ctx.guild.id);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`⚙️ ${ctx.guild.name} Settings`).addFields(
      { name: "Prefix", value: (s as any)?.prefix ?? config.defaultPrefix ?? "!", inline: true },
      { name: "Log Channel", value: (s as any)?.logChannelId ? `<#${(s as any).logChannelId}>` : "Not set", inline: true },
      { name: "Welcome Channel", value: (s as any)?.welcomeChannelId ? `<#${(s as any).welcomeChannelId}>` : "Not set", inline: true },
      { name: "Mute Role", value: (s as any)?.muteRoleId ? `<@&${(s as any).muteRoleId}>` : "Not set", inline: true },
      { name: "Mod Role", value: (s as any)?.modRoleId ? `<@&${(s as any).modRoleId}>` : "Not set", inline: true },
      { name: "Auto Role", value: (s as any)?.autoRoleId ? `<@&${(s as any).autoRoleId}>` : "Not set", inline: true },
    ).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
