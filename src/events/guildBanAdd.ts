import type { Client, GuildBan, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "guildBanAdd",
  async execute(client: Client, ban: GuildBan) {
    const settings = await getGuildSettings(ban.guild.id);
    if (!settings.modLogChannel) return;
    const ch = ban.guild.channels.cache.get(settings.modLogChannel);
    if (!ch?.isTextBased()) return;
    const embed = brandEmbed({
      title: "🔨 Member Banned",
      description: `<@${ban.user.id}> (${ban.user.tag})\n**Reason:** ${ban.reason ?? "No reason"}`,
      page: "Logs",
      thumbnail: ban.user.displayAvatarURL(),
    });
    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
