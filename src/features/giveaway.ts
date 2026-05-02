import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
import { eq, and, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { giveaways } from "../db/schema.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export async function createGiveaway(
  client: Client,
  guildId: string,
  channelId: string,
  hostId: string,
  prize: string,
  winnersCount: number,
  endsAt: Date
): Promise<number> {
  const result = await db.insert(giveaways).values({
    guildId, channelId, hostId, prize, winnersCount, endsAt, ended: false, winners: [],
  }).returning({ id: giveaways.id });
  const id = result[0].id;

  const ch = client.channels.cache.get(channelId) as TextChannel | undefined;
  if (!ch) return id;

  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(
      `**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Hosted by:** <@${hostId}>\n**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n\nReact with 🎉 to enter!`
    )
    .setFooter({ text: `ID: ${id} • ${config.embedFooter}` })
    .setTimestamp(endsAt);

  const msg = await ch.send({ embeds: [embed] });
  await msg.react("🎉").catch(() => {});
  await db.update(giveaways).set({ messageId: msg.id }).where(eq(giveaways.id, id));
  return id;
}

export async function endGiveaway(client: Client, giveawayId: number): Promise<void> {
  const rows = await db.select().from(giveaways).where(eq(giveaways.id, giveawayId));
  const giveaway = rows[0];
  if (!giveaway || giveaway.ended) return;

  await db.update(giveaways).set({ ended: true }).where(eq(giveaways.id, giveawayId));

  const ch = client.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
  if (!ch || !giveaway.messageId) return;

  const msg = await ch.messages.fetch(giveaway.messageId).catch(() => null);
  if (!msg) return;

  const reaction = msg.reactions.cache.get("🎉");
  const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
  const entrants = users ? [...users.values()].filter((u) => !u.bot) : [];

  const winners: string[] = [];
  const pool = [...entrants];
  for (let i = 0; i < giveaway.winnersCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool[idx].id);
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
    await ch.send({ content: `No one entered the giveaway for **${giveaway.prize}**.` }).catch(() => {});
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
