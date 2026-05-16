import type {
  Client,
  GuildMember,
  PartialGuildMember,
  TextChannel,
} from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { handleBoostEnd } from "../features/boosterRoles.js";

export const event = {
  name: "guildMemberUpdate",
  async execute(
    client: Client,
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember
  ) {
    // ── Booster role cleanup when boost is removed ────────────────────────────
    const wasBooster = (oldMember as GuildMember).premiumSince !== null;
    const isBooster  = newMember.premiumSince !== null;
    if (wasBooster && !isBooster) {
      await handleBoostEnd(newMember.guild, newMember).catch(() => {});
    }

    // ── Role change logging ───────────────────────────────────────────────────
    const settings = await getGuildSettings(newMember.guild.id);
    if (!settings.modLogChannel) return;
    const oldRoles = (oldMember as GuildMember).roles?.cache;
    if (!oldRoles) return;
    const added = newMember.roles.cache.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newMember.roles.cache.has(r.id));
    if (added.size === 0 && removed.size === 0) return;
    const ch = newMember.guild.channels.cache.get(settings.modLogChannel);
    if (!ch?.isTextBased()) return;
    let desc = `<@${newMember.id}> (${newMember.user.tag})\n`;
    if (added.size) desc += `**Added:** ${added.map((r) => `<@&${r.id}>`).join(", ")}\n`;
    if (removed.size) desc += `**Removed:** ${removed.map((r) => `<@&${r.id}>`).join(", ")}`;
    await (ch as TextChannel)
      .send({
        embeds: [
          brandEmbed({
            title: "🎭 Roles Updated",
            description: desc,
            page: "Logs",
          }),
        ],
      })
      .catch(() => {});
  },
};
