import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
import { eq, and, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { giveaways } from "../db/schema.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getLevel } from "./leveling.js";

function buildGiveawayEmbed(gw: {
  id: number;
  prize: string;
  description?: string | null;
  thumbnail?: string | null;
  imageUrl?: string | null;
  winnersCount: number;
  hostId: string;
  endsAt: Date;
  requiredRoleIds?: string[] | null;
  minLevel?: number | null;
  maxLevel?: number | null;
}): EmbedBuilder {
  const lines: string[] = [];
  lines.push(`**Prize:** ${gw.prize}`);
  if (gw.description) lines.push(gw.description);
  lines.push(`**Winners:** ${gw.winnersCount}`);
  lines.push(`**Hosted by:** <@${gw.hostId}>`);
  lines.push(`**Ends:** <t:${Math.floor(gw.endsAt.getTime() / 1000)}:R>`);

  const reqs: string[] = [];
  if (gw.requiredRoleIds?.length) reqs.push(`roles: ${gw.requiredRoleIds.map((r) => `<@&${r}>`).join(", ")}`);
  if (gw.minLevel != null) reqs.push(`min level: ${gw.minLevel}`);
  if (gw.maxLevel != null) reqs.push(`max level: ${gw.maxLevel}`);
  if (reqs.length) lines.push(`\n**Requirements:** ${reqs.join(" | ")}`);

  lines.push("\nReact with 🎉 to enter!");

  const eb = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `ID: ${gw.id} • ${config.embedFooter}` })
    .setTimestamp(gw.endsAt);

  if (gw.thumbnail) eb.setThumbnail(gw.thumbnail);
  if (gw.imageUrl) eb.setImage(gw.imageUrl);

  return eb;
}

export async function createGiveaway(
  client: Client,
  guildId: string,
  channelId: string,
  hostId: string,
  prize: string,
  winnersCount: number,
  endsAt: Date,
  opts?: {
    description?: string;
    thumbnail?: string;
    imageUrl?: string;
    requiredRoleIds?: string[];
    minLevel?: number;
    maxLevel?: number;
  }
): Promise<number> {
  const result = await db.insert(giveaways).values({
    guildId, channelId, hostId, prize, winnersCount, endsAt, ended: false, winners: [],
    description: opts?.description,
    thumbnail: opts?.thumbnail,
    imageUrl: opts?.imageUrl,
    requiredRoleIds: opts?.requiredRoleIds ?? [],
    minLevel: opts?.minLevel,
    maxLevel: opts?.maxLevel,
  }).returning({ id: giveaways.id });
  const id = result[0].id;

  const ch = client.channels.cache.get(channelId) as TextChannel | undefined;
  // FIX: previously cast to TextChannel and called .send() without checking
  // isTextBased() — a bad/non-text channelId would throw and leave a DB row
  // with no message ever attached to it.
  if (!ch || !ch.isTextBased()) return id;

  const embed = buildGiveawayEmbed({
    id, prize, winnersCount, hostId, endsAt,
    description: opts?.description,
    thumbnail: opts?.thumbnail,
    imageUrl: opts?.imageUrl,
    requiredRoleIds: opts?.requiredRoleIds,
    minLevel: opts?.minLevel,
    maxLevel: opts?.maxLevel,
  });

  const msg = await ch.send({ embeds: [embed] });
  await msg.react("🎉").catch(() => {});
  await db.update(giveaways).set({ messageId: msg.id }).where(eq(giveaways.id, id));
  return id;
}

// FIX: previously fetched only the first page (100 users) of reactors with no
// pagination — giveaways with 100+ entrants silently dropped everyone past
// that point. Now pages through with `after` cursors until exhausted.
async function fetchAllReactors(reaction: any): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;
  for (;;) {
    const batch = await reaction.users.fetch({ limit: 100, after }).catch(() => null);
    if (!batch || batch.size === 0) break;
    for (const u of batch.values()) {
      if (!u.bot) ids.push(u.id);
    }
    if (batch.size < 100) break;
    after = batch.last()?.id;
    if (!after) break;
  }
  return ids;
}

// FIX: requiredRoleIds/minLevel/maxLevel were stored and shown in the embed
// but never actually enforced — anyone who reacted could win regardless of
// requirements. This now filters entrants against them before picking winners.
async function filterEligible(
  guildId: string,
  entrantIds: string[],
  guild: Client["guilds"]["cache"] extends Map<string, infer G> ? G : never,
  requiredRoleIds: string[] | null | undefined,
  minLevel: number | null | undefined,
  maxLevel: number | null | undefined,
): Promise<string[]> {
  const eligible: string[] = [];
  for (const userId of entrantIds) {
    if (requiredRoleIds?.length) {
      const member = await (guild as any).members.fetch(userId).catch(() => null);
      if (!member) continue;
      const hasAllRoles = requiredRoleIds.every((r) => member.roles.cache.has(r));
      if (!hasAllRoles) continue;
    }
    if (minLevel != null || maxLevel != null) {
      const levelRow = await getLevel(guildId, userId);
      const level = levelRow?.level ?? 0;
      if (minLevel != null && level < minLevel) continue;
      if (maxLevel != null && level > maxLevel) continue;
    }
    eligible.push(userId);
  }
  return eligible;
}

// FIX: previously SELECT -> check `ended` -> UPDATE were three separate
// steps, so two concurrent calls (e.g. manual /end racing the 15s loop)
// could both pass the ended check before either wrote, picking winners
// twice. Now the UPDATE itself is the guard: it only flips ended=true if it
// was still false, and we check rowCount to know if we "won" the race.
export async function endGiveaway(client: Client, giveawayId: number): Promise<void> {
  const claimed = await db
    .update(giveaways)
    .set({ ended: true })
    .where(and(eq(giveaways.id, giveawayId), eq(giveaways.ended, false)))
    .returning({ id: giveaways.id });

  if (claimed.length === 0) return; // already ended by another caller, or doesn't exist

  const rows = await db.select().from(giveaways).where(eq(giveaways.id, giveawayId));
  const giveaway = rows[0];
  if (!giveaway) return;

  const ch = client.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
  if (!ch || !giveaway.messageId) return;

  const msg = await ch.messages.fetch(giveaway.messageId).catch(() => null);
  if (!msg) return;

  const reaction = msg.reactions.cache.get("🎉");
  const allEntrants = reaction ? await fetchAllReactors(reaction) : [];

  const eligible = await filterEligible(
    giveaway.guildId,
    allEntrants,
    msg.guild as any,
    giveaway.requiredRoleIds,
    giveaway.minLevel,
    giveaway.maxLevel,
  );

  const winners: string[] = [];
  const pool = [...eligible];
  for (let i = 0; i < giveaway.winnersCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool[idx]);
    pool.splice(idx, 1);
  }

  await db.update(giveaways).set({ winners }).where(eq(giveaways.id, giveawayId));

  const winText = winners.length > 0 ? winners.map((w) => `<@${w}>`).join(", ") : "No valid entrants";
  const endEmbed = new EmbedBuilder()
    .setColor(winners.length > 0 ? 0x57f287 : 0xed4245)
    .setTitle("🎉 GIVEAWAY ENDED 🎉")
    .setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${winText}\n**Hosted by:** <@${giveaway.hostId}>`)
    .setFooter({ text: `ID: ${giveawayId} • ${config.embedFooter}` })
    .setTimestamp(new Date());

  await msg.edit({ embeds: [endEmbed] }).catch(() => {});
  if (winners.length > 0) {
    await ch.send({
      content: `🎉 Congratulations ${winText}! You won **${giveaway.prize}**!`,
      allowedMentions: { users: winners },
    }).catch(() => {});
  } else {
    await ch.send({ content: `No one eligible entered the giveaway for **${giveaway.prize}**.` }).catch(() => {});
  }
}

export function startGiveawayLoop(client: Client): void {
  setInterval(async () => {
    try {
      const due = await db.select().from(giveaways).where(
        and(eq(giveaways.ended, false), lte(giveaways.endsAt, new Date()))
      );
      for (const g of due) await endGiveaway(client, g.id);
    } catch (err) {
      logger.warn({ err }, "Giveaway loop error");
    }
  }, 15_000);
}
