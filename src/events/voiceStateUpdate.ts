import type { Client, VoiceState, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { handleVoiceStateUpdate as vmHandle } from "../features/voicemaster.js";

export const event = {
  name: "voiceStateUpdate",
  async execute(client: Client, oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild;
    if (!guild) return;
    await vmHandle(client, oldState, newState);

    const settings = await getGuildSettings(guild.id);
    if (!settings.voiceLogChannel) return;
    const ch = guild.channels.cache.get(settings.voiceLogChannel);
    if (!ch?.isTextBased()) return;

    if (!oldState.channel && newState.channel) {
      await (ch as TextChannel)
        .send({
          embeds: [
            brandEmbed({
              title: "🔊 Voice Joined",
              description: `<@${newState.id}> joined <#${newState.channel.id}>`,
              page: "Logs",
            }),
          ],
        })
        .catch(() => {});
    } else if (oldState.channel && !newState.channel) {
      await (ch as TextChannel)
        .send({
          embeds: [
            brandEmbed({
              title: "🔇 Voice Left",
              description: `<@${oldState.id}> left <#${oldState.channel.id}>`,
              page: "Logs",
            }),
          ],
        })
        .catch(() => {});
    } else if (
      oldState.channel &&
      newState.channel &&
      oldState.channel.id !== newState.channel.id
    ) {
      await (ch as TextChannel)
        .send({
          embeds: [
            brandEmbed({
              title: "🔁 Voice Moved",
              description: `<@${newState.id}> moved from <#${oldState.channel.id}> → <#${newState.channel.id}>`,
              page: "Logs",
            }),
          ],
        })
        .catch(() => {});
    }
  },
};
