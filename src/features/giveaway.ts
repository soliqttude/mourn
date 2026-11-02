import { EmbedBuilder, type Client, type TextChannel, type Guild } from "discord.js";
import { eq, and, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { giveaways } from "../db/schema.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getLevel } from "./leveling.js";

type GiveawayRow = typeof giveaways.$inferSelect;

export function buildGiveawayEmbed(gw: GiveawayRow): EmbedBuilder {
  const lines = [
    `**Prize:** ${gw.prize}`,
    gw.description || "",
    `**Winners:** ${gw.winnersCount}`,
    `**Hosted by:** ${(gw.hostIds?.length ? gw.hostIds : [gw.hostId]).map(id => `<@${id}>`).join(", ")}`,
    `**Ends:** <t:${Math.floor(gw.endsAt.getTime() / 1000)}:R>`,
  ].filter(Boolean);
  const requirements: string[] = [];
  if (gw.requiredRoleIds?.length) requirements.push(`Required roles: ${gw.requiredRoleIds.map(id => `<@&${id}>`).join(", ")}`);
  if (gw.minLevel != null) requirements.push(`Minimum level: ${gw.minLevel}`);
  if (gw.maxLevel != null) requirements.push(`Maximum level: ${gw.maxLevel}`);
  if (gw.minAccountAgeDays != null) requirements.push(`Account age: ${gw.minAccountAgeDays}+ days`);
  if (gw.minServerStayDays != null) requirements.push(`Server membership: ${gw.minServerStayDays}+ days`);
  if (requirements.length) lines.push("", "**Entry requirements**", ...requirements);
  lines.push("", "React with 🎉 to enter!");
  const embed = new EmbedBuilder()
    .setColor(gw.color ? Number.parseInt(gw.color.replace(/^#/, ""), 16) : config.brandColor)
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `ID: ${gw.id} • ${config.embedFooter}` })
    .setTimestamp(gw.endsAt);
  if (gw.thumbnail) embed.setThumbnail(gw.thumbnail);
  if (gw.imageUrl) embed.setImage(gw.imageUrl);
  return embed;
}

export async function createGiveaway(
  client: Client, guildId: string, channelId: string, hostId: string,
  prize: string, winnersCount: number, endsAt: Date,
  opts: Partial<typeof giveaways.$inferInsert> = {},
): Promise<number> {
  const inserted = await db.insert(giveaways).values({
    guildId, channelId, hostId, prize, winnersCount, endsAt, ended: false, winners: [],
    description: opts.description ?? null,
    thumbnail: opts.thumbnail ?? null,
    imageUrl: opts.imageUrl ?? null,
    requiredRoleIds: opts.requiredRoleIds ?? [],
    minLevel: opts.minLevel ?? null,
    maxLevel: opts.maxLevel ?? null,
    color: opts.color ?? null,
    hostIds: opts.hostIds ?? [hostId],
    awardRoleIds: opts.awardRoleIds ?? [],
    minAccountAgeDays: opts.minAccountAgeDays ?? null,
    minServerStayDays: opts.minServerStayDays ?? null,
  }).returning({ id: giveaways.id });
  const id = inserted[0]!.id;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) {
    await db.delete(giveaways).where(eq(giveaways.id, id));
    throw new Error("The selected channel is not a text channel I can post in.");
  }
  try {
    const row = (await db.select().from(giveaways).where(eq(giveaways.id, id)))[0]!;
    const message = await (channel as TextChannel).send({ embeds: [buildGiveawayEmbed(row)] });
    try {
      await message.react("🎉");
    } catch {
      await message.delete().catch(() => {});
      throw new Error("I posted the giveaway but could not add the entry reaction. Check my Add Reactions permission and try again.");
    }
    await db.update(giveaways).set({ messageId: message.id }).where(eq(giveaways.id, id));
    return id;
  } catch (error) {
    await db.delete(giveaways).where(eq(giveaways.id, id)).catch(() => {});
    throw error;
  }
}

async function fetchAllEntrants(reaction: any): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;
  while (true) {
    const batch = await reaction.users.fetch({ limit: 100, ...(after ? { after } : {}) });
    if (!batch.size) break;
    for (const user of batch.values()) if (!user.bot) ids.push(user.id);
    if (batch.size < 100) break;
    after = batch.last()?.id;
    if (!after) break;
  }
  return ids;
}

async function eligibleEntrants(guild: Guild, giveaway: GiveawayRow, ids: string[]): Promise<string[]> {
  const eligible: string[] = [];
  for (const id of ids) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (!member) continue;
    if (giveaway.requiredRoleIds?.length && !giveaway.requiredRoleIds.every(roleId => member.roles.cache.has(roleId))) continue;
    if (giveaway.minLevel != null || giveaway.maxLevel != null) {
      const level = (await getLevel(giveaway.guildId, id))?.level ?? 0;
      if (giveaway.minLevel != null && level < giveaway.minLevel) continue;
      if (giveaway.maxLevel != null && level > giveaway.maxLevel) continue;
    }
    if (giveaway.minAccountAgeDays != null &&
      Date.now() - member.user.createdAt.getTime() < giveaway.minAccountAgeDays * 86_400_000) continue;
    if (giveaway.minServerStayDays != null &&
      (!member.joinedAt || Date.now() - member.joinedAt.getTime() < giveaway.minServerStayDays * 86_400_000)) continue;
    eligible.push(id);
  }
  return eligible;
}

function choose(ids: string[], count: number, exclude: string[] = []): string[] {
  const pool = ids.filter(id => !exclude.includes(id));
  const result: string[] = [];
  while (result.length < count && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]!);
  }
  return result;
}

export async function endGiveaway(client: Client, giveawayId: number): Promise<string[]> {
  const claimed = await db.update(giveaways).set({ ended: true })
    .where(and(eq(giveaways.id, giveawayId), eq(giveaways.ended, false)))
    .returning({ id: giveaways.id });
  if (!claimed.length) {
    const existing = (await db.select().from(giveaways).where(eq(giveaways.id, giveawayId)))[0];
    if (!existing) throw new Error("Giveaway not found.");
    throw new Error("That giveaway has already ended or is currently being processed.");
  }

  try {
    const giveaway = (await db.select().from(giveaways).where(eq(giveaways.id, giveawayId)))[0];
    if (!giveaway?.messageId) throw new Error("The giveaway message is not saved. The giveaway cannot be ended.");
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel?.isTextBased() || !("messages" in channel)) throw new Error("Giveaway channel not found or is not accessible.");
    const textChannel = channel as TextChannel;
    const message = await textChannel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) throw new Error("Giveaway message not found. Check that it still exists and that I can view its channel.");

    const reaction = message.reactions.cache.get("🎉");
    const entrants = reaction ? await fetchAllEntrants(reaction) : [];
    const eligible = await eligibleEntrants(message.guild, giveaway, entrants);
    const winners = choose(eligible, giveaway.winnersCount);
    const mentions = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "No eligible entrants";
    const ended = new EmbedBuilder().setColor(winners.length ? 0x57f287 : 0xed4245)
      .setTitle("🎉 GIVEAWAY ENDED 🎉")
      .setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${mentions}\n**Hosted by:** <@${giveaway.hostId}>`)
      .setFooter({ text: `ID: ${giveawayId} • ${config.embedFooter}` }).setTimestamp(new Date());

    await message.edit({ embeds: [ended] });
    await db.update(giveaways).set({ winners }).where(eq(giveaways.id, giveawayId));
    if (winners.length) {
      await textChannel.send({ content: `🎉 Congratulations ${mentions}! You won **${giveaway.prize}**!`,
        allowedMentions: { users: winners } }).catch(err =>
          logger.warn({ err, giveawayId }, "giveaway winner announcement failed"));
      if (giveaway.awardRoleIds?.length) {
        for (const winnerId of winners) {
          const member = await message.guild.members.fetch(winnerId).catch(() => null);
          if (member) await member.roles.add(giveaway.awardRoleIds).catch(err =>
            logger.warn({ err, winnerId }, "giveaway winner role grant failed"));
        }
      }
    } else {
      await textChannel.send({ content: `No one eligible entered the giveaway for **${giveaway.prize}**.` }).catch(err =>
        logger.warn({ err, giveawayId }, "empty giveaway announcement failed"));
    }
    return winners;
  } catch (error) {
    await db.update(giveaways).set({ ended: false }).where(eq(giveaways.id, giveawayId)).catch(() => {});
    throw error;
  }
}

export async function rerollGiveaway(client: Client, giveaway: GiveawayRow, winnerCount: number): Promise<string[]> {
  if (!giveaway.ended || !giveaway.messageId) throw new Error("That giveaway has not ended or its message is unavailable.");
  if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 100) throw new Error("Winner count must be between 1 and 100.");
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased() || !("messages" in channel)) throw new Error("Giveaway channel not found.");
  const textChannel = channel as TextChannel;
  const message = await textChannel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) throw new Error("Giveaway message not found.");
  const reaction = message.reactions.cache.get("🎉");
  const entrants = reaction ? await fetchAllEntrants(reaction) : [];
  const eligible = await eligibleEntrants(message.guild, giveaway, entrants);
  const winners = choose(eligible, winnerCount, giveaway.winners ?? []);
  if (!winners.length) throw new Error("There are no other eligible entrants to reroll. A reroll needs at least one eligible participant who has not already won.");
  await db.update(giveaways).set({ winners: [...(giveaway.winners ?? []), ...winners] }).where(eq(giveaways.id, giveaway.id));
  const mentions = winners.map(id => `<@${id}>`).join(", ");
  await textChannel.send({ content: `🎉 Rerolled winner(s) for **${giveaway.prize}**: ${mentions}!`,
    allowedMentions: { users: winners } });
  return winners;
}

export async function refreshGiveawayMessage(client: Client, giveaway: GiveawayRow): Promise<void> {
  if (!giveaway.messageId) throw new Error("The giveaway message ID is missing.");
  if (giveaway.ended) throw new Error("You can only refresh an active giveaway.");
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased() || !("messages" in channel)) {
    throw new Error("I cannot access the giveaway channel. Check my View Channel and Read Message History permissions.");
  }
  const message = await (channel as TextChannel).messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) throw new Error("I cannot find the original giveaway message. It may have been deleted.");
  await message.edit({ embeds: [buildGiveawayEmbed(giveaway)] });
}

export async function cancelGiveaway(client: Client, giveaway: GiveawayRow): Promise<void> {
  if (giveaway.ended) throw new Error("That giveaway has already ended or been cancelled.");
  if (!giveaway.messageId) throw new Error("The giveaway message is unavailable.");
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased() || !("messages" in channel)) throw new Error("Giveaway channel not found or is not accessible.");
  const message = await (channel as TextChannel).messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) throw new Error("Giveaway message not found. I cannot delete a message I cannot access.");
  const claimed = await db.update(giveaways).set({ ended: true })
    .where(and(eq(giveaways.id, giveaway.id), eq(giveaways.ended, false)))
    .returning({ id: giveaways.id });
  if (!claimed.length) throw new Error("That giveaway has already ended or another action is processing it.");
  try {
    await message.delete();
  } catch (error) {
    await db.update(giveaways).set({ ended: false }).where(eq(giveaways.id, giveaway.id)).catch(() => {});
    throw new Error("I could not delete the giveaway message. Check that I can view the channel and manage my own messages.");
  }
}

export function startGiveawayLoop(client: Client): void {
  setInterval(async () => {
    try {
      const due = await db.select().from(giveaways).where(and(eq(giveaways.ended, false), lte(giveaways.endsAt, new Date())));
      for (const giveaway of due) await endGiveaway(client, giveaway.id);
    } catch (err) {
      logger.warn({ err }, "Giveaway loop error");
    }
  }, 15_000);
}
