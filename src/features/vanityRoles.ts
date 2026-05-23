import { type Client, type GuildMember, EmbedBuilder } from "discord.js";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { vanityConfig, vanityRoles, vanityMembers } from "../db/schema.js";
import { parseScript } from "../lib/scripting.js";
import { logger } from "../lib/logger.js";

export async function handleVanityPresence(client: Client, member: GuildMember): Promise<void> {
  try {
    const rows = await db.select().from(vanityConfig).where(eq(vanityConfig.guildId, member.guild.id));
    const cfg = rows[0];
    if (!cfg) return;

    const presence = member.presence ?? await member.guild.members.fetch({ user: member.id, force: true }).then(m => m.presence).catch(() => null);
    const statusText = presence?.activities?.find(a => a.type === 4)?.state ?? "";
    const hasVanity = statusText.toLowerCase().includes(cfg.vanity.toLowerCase());

    const existing = await db.select().from(vanityMembers).where(
      and(eq(vanityMembers.guildId, member.guild.id), eq(vanityMembers.userId, member.id))
    );
    const hadVanity = existing.length > 0;

    const roles = await db.select().from(vanityRoles).where(eq(vanityRoles.guildId, member.guild.id));

    if (hasVanity && !hadVanity) {
      await db.insert(vanityMembers).values({ guildId: member.guild.id, userId: member.id }).onConflictDoNothing();
      for (const r of roles) {
        const role = member.guild.roles.cache.get(r.roleId);
        if (role) await member.roles.add(role).catch(() => {});
      }
      if (cfg.channelId && cfg.message) {
        const ch = member.guild.channels.cache.get(cfg.channelId);
        if (ch?.isTextBased()) {
          const { embed, content } = parseScript(cfg.message, { user: member, guild: member.guild });
          await (ch as any).send({ content, embeds: embed ? [embed] : [] }).catch(() => {});
        }
      }
    } else if (!hasVanity && hadVanity) {
      await db.delete(vanityMembers).where(
        and(eq(vanityMembers.guildId, member.guild.id), eq(vanityMembers.userId, member.id))
      );
      for (const r of roles) {
        const role = member.guild.roles.cache.get(r.roleId);
        if (role) await member.roles.remove(role).catch(() => {});
      }
    }
  } catch (err) {
    logger.warn({ err }, "vanity roles presence error");
  }
}
