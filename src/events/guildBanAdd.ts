import type { Client, GuildBan, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "guildBanAdd",
  async execute(_client: Client, ban: GuildBan) {
    const settings = await getGuildSettings(ban.guild.id);
    if (!settings.modLogChannel) return;
    const ch = ban.guild.channels.cache.get(settings.modLogChannel);
    if (!ch?.isTextBased()) return;

    const embed = brandEmbed({
      description: `**reason** — ${ban.reason?.toLowerCase() ?? "no reason provided"}`,
      thumbnail: ban.user.displayAvatarURL({ size: 256 }),
      authorName: `banned — ${ban.user.username}`,
      authorIcon: ban.user.displayAvatarURL({ size: 64 }),
    });
    embed.setTimestamp();
    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
