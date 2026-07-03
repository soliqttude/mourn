import type { Client, GuildMember, PartialGuildMember, TextChannel } from "discord.js";
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleBoostEnd } from "../features/boosterRoles.js";
import { handlePermissionEscalation } from "../features/antinuke.js";

export const event = {
  name: "guildMemberUpdate",
  async execute(client: Client, oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    const wasBooster = (oldMember as GuildMember).premiumSince !== null;
    const isBooster  = newMember.premiumSince !== null;
    if (wasBooster && !isBooster) await handleBoostEnd(newMember.guild, newMember).catch(() => {});

    // Auto-assign boost role when someone starts boosting
    if (!wasBooster && isBooster) {
      const settings = await getGuildSettings(newMember.guild.id);
      const boostRoleId = (settings as any).boostRoleId as string | null;
      if (boostRoleId) {
        const role = newMember.guild.roles.cache.get(boostRoleId);
        if (role) await newMember.roles.add(role, "server boost").catch(() => {});
      }
    }

    // Remove boost role when someone stops boosting
    if (wasBooster && !isBooster) {
      const settings = await getGuildSettings(newMember.guild.id);
      const boostRoleId = (settings as any).boostRoleId as string | null;
      if (boostRoleId && newMember.roles.cache.has(boostRoleId)) {
        await newMember.roles.remove(boostRoleId, "boost ended").catch(() => {});
      }
    }

    const oldRoles = (oldMember as GuildMember).roles?.cache;
    if (oldRoles) {
      const addedRoleIds = newMember.roles.cache.filter(r => !oldRoles.has(r.id)).map(r => r.id);
      if (addedRoleIds.length > 0) await handlePermissionEscalation(client, newMember.guild, newMember, addedRoleIds).catch(() => {});
    }

    const settings    = await getGuildSettings(newMember.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;
    if (!oldRoles) return;

    const added   = newMember.roles.cache.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newMember.roles.cache.has(r.id));
    const oldNick  = (oldMember as GuildMember).nickname;
    const newNick  = newMember.nickname;
    const nickChanged = oldNick !== newNick;
    if (added.size === 0 && removed.size === 0 && !nickChanged) return;

    const ch = newMember.guild.channels.cache.get(logChannelId);
    if (!ch?.isTextBased()) return;

    let executor: string | null = null;
    try {
      const auditType = nickChanged && added.size === 0 && removed.size === 0
        ? AuditLogEvent.MemberUpdate
        : AuditLogEvent.MemberRoleUpdate;
      const audit = await newMember.guild.fetchAuditLogs({ type: auditType, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.targetId === newMember.id && (Date.now() - entry.createdTimestamp) < 5000)
        executor = entry.executorId ?? null;
    } catch {}

    const avatarURL = newMember.user.displayAvatarURL({ size: 256 }) ?? undefined;
    const fields: { name: string; value: string; inline: boolean }[] = [];
    if (added.size)   fields.push({ name: `Roles Added (${added.size})`,     value: added.map((r) => `<@&${r.id}>`).join(", ").slice(0, 1024),   inline: false });
    if (removed.size) fields.push({ name: `Roles Removed (${removed.size})`, value: removed.map((r) => `<@&${r.id}>`).join(", ").slice(0, 1024), inline: false });
    if (nickChanged)  fields.push({ name: "Nickname", value: `\`${oldNick ?? "none"}\` → \`${newNick ?? "none"}\``, inline: false });

    const action = nickChanged && added.size === 0 && removed.size === 0 ? "Nickname Updated" : "Member Updated";

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: action, iconURL: avatarURL })
      .setDescription(
        `<@${newMember.id}> was updated${executor && executor !== newMember.id ? ` by <@${executor}>` : ""}`
      )
      .addFields(...fields)
      .setTimestamp()
      .setFooter({ text: `User ID: ${newMember.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
