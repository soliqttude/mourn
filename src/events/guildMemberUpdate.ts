import type { Client, GuildMember, PartialGuildMember, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleBoostEnd } from "../features/boosterRoles.js";

export const event = {
  name: "guildMemberUpdate",
  async execute(_client: Client, oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    const wasBooster = (oldMember as GuildMember).premiumSince !== null;
    const isBooster  = newMember.premiumSince !== null;
    if (wasBooster && !isBooster) {
      await handleBoostEnd(newMember.guild, newMember).catch(() => {});
    }

    const settings = await getGuildSettings(newMember.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;

    const oldRoles = (oldMember as GuildMember).roles?.cache;
    if (!oldRoles) return;
    const added   = newMember.roles.cache.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newMember.roles.cache.has(r.id));
    if (added.size === 0 && removed.size === 0) return;

    const ch = newMember.guild.channels.cache.get(logChannelId);
    if (!ch?.isTextBased()) return;

    const avatarURL = newMember.user.displayAvatarURL({ size: 256 });
    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: "member", value: `<@${newMember.id}> \`${newMember.id}\``, inline: false },
    ];
    if (added.size)   fields.push({ name: `roles added (${added.size})`,     value: added.map((r) => `<@&${r.id}>`).join(", ").slice(0, 1024),   inline: false });
    if (removed.size) fields.push({ name: `roles removed (${removed.size})`, value: removed.map((r) => `<@&${r.id}>`).join(", ").slice(0, 1024), inline: false });

    const embed = new EmbedBuilder()
      .setColor(added.size ? 0x9b59b6 : 0xe74c3c)
      .setAuthor({ name: `${newMember.user.username} — roles updated`, iconURL: avatarURL })
      .setThumbnail(avatarURL)
      .addFields(...fields)
      .setTimestamp()
      .setFooter({ text: `user id: ${newMember.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
