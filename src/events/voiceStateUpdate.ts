import type { Client, VoiceState, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings, getLogEmbedColor, isLogTargetIgnored } from "../db/settings.js";
import { handleVoiceStateUpdate as vmHandle } from "../features/voicemaster.js";

export const event = {
  name: "voiceStateUpdate",
  async execute(client: Client, oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild;
    if (!guild) return;
    await vmHandle(client, oldState, newState);
    const settings = await getGuildSettings(guild.id);
    if (!settings.voiceLogChannel) return;
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;
    if (await isLogTargetIgnored(guild.id, member.id) || await isLogTargetIgnored(guild.id, oldState.channelId ?? "") || await isLogTargetIgnored(guild.id, newState.channelId ?? "")) return;
    const ch = guild.channels.cache.get(settings.voiceLogChannel);
    if (!ch?.isTextBased()) return;
    const avatarURL = member.user.displayAvatarURL({ size: 64 }) ?? undefined;
    let title: string | null = null;
    let description = "";
    if (!oldState.channel && newState.channel) {
      title = "Joined Voice";
      description = `<@${member.id}> joined <#${newState.channel.id}> (${newState.channel.members.size} member${newState.channel.members.size === 1 ? "" : "s"})`;
    } else if (oldState.channel && !newState.channel) {
      title = "Left Voice";
      description = `<@${member.id}> left <#${oldState.channel.id}> (${oldState.channel.members.size} remaining)`;
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      title = "Moved Channels";
      description = `<@${member.id}> moved from <#${oldState.channel.id}> to <#${newState.channel.id}>`;
    } else if (!oldState.mute && newState.mute) {
      title = "Server Muted";
      description = `<@${member.id}> was server muted${newState.channel ? ` in <#${newState.channel.id}>` : ""}`;
    } else if (oldState.mute && !newState.mute) {
      title = "Server Unmuted";
      description = `<@${member.id}> was server unmuted${newState.channel ? ` in <#${newState.channel.id}>` : ""}`;
    } else if (!oldState.deaf && newState.deaf) {
      title = "Server Deafened";
      description = `<@${member.id}> was server deafened${newState.channel ? ` in <#${newState.channel.id}>` : ""}`;
    } else if (oldState.deaf && !newState.deaf) {
      title = "Server Undeafened";
      description = `<@${member.id}> was server undeafened${newState.channel ? ` in <#${newState.channel.id}>` : ""}`;
    }
    if (!title) return;
    const embed = new EmbedBuilder()
      .setColor(getLogEmbedColor(settings, "voice", settings.voiceLogChannel)).setAuthor({ name: title, iconURL: avatarURL })
      .setDescription(description).setTimestamp().setFooter({ text: `User ID: ${member.id}` });
    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
