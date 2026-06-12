import type { Client, GuildBan, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "guildBanAdd",
  async execute(_client: Client, ban: GuildBan) {
    const settings = await getGuildSettings(ban.guild.id);
    if (!settings.modLogChannel) return;
    const ch = ban.guild.channels.cache.get(settings.modLogChannel);
    if (!ch?.isTextBased()) return;

    const created = Math.floor(ban.user.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({
        name: `${ban.user.username} banned`,
        iconURL: ban.user.displayAvatarURL({ size: 64 }),
      })
      .setThumbnail(ban.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "user",    value: `<@${ban.user.id}> \`${ban.user.id}\``, inline: false },
        { name: "reason",  value: ban.reason?.toLowerCase() ?? "no reason provided", inline: false },
        { name: "account created", value: `<t:${created}:R>`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `user id: ${ban.user.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
