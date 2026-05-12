import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { db } from "../db/index.js";
import { guildSettings } from "../db/schema.js";
import { isNotNull, eq } from "drizzle-orm";
import { addBalance } from "./economy.js";
import { logger } from "../lib/logger.js";

export const activeDrop = new Map<string, { amount: number; messageId: string }>();

const MIN_INTERVAL_MS = 2 * 60 * 60 * 1000;
const MAX_INTERVAL_MS = 4 * 60 * 60 * 1000;
const MIN_AMOUNT = 250;
const MAX_AMOUNT = 750;

function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

async function fireDrop(client: Client, guildId: string, channelId: string): Promise<void> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  const amount = MIN_AMOUNT + Math.floor(Math.random() * (MAX_AMOUNT - MIN_AMOUNT + 1));

  const embed = new EmbedBuilder()
    .setColor(0xf9c74f)
    .setTitle("🎁 coin drop!")
    .setDescription(`**${amount.toLocaleString()} coins** just dropped!\n\ntype \`claim\` to grab them — first come, first served!`)
    .setFooter({ text: "mourn drops • be quick!" })
    .setTimestamp();

  let msg: any;
  try {
    msg = await (channel as any).send({ embeds: [embed] });
  } catch {
    return;
  }

  activeDrop.set(guildId, { amount, messageId: msg.id });

  const collector = (channel as any).createMessageCollector?.({
    filter: (m: any) => !m.author.bot && m.content.toLowerCase().trim() === "claim",
    max: 1,
    time: 10 * 60 * 1000,
  });

  collector?.on("collect", async (m: any) => {
    const drop = activeDrop.get(guildId);
    if (!drop) return;
    activeDrop.delete(guildId);
    await addBalance(guildId, m.author.id, drop.amount).catch(() => {});
    await m.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2D6A4F)
          .setDescription(`🎉 **${m.author.username}** claimed the drop and got **${drop.amount.toLocaleString()} coins**!`)
          .setTimestamp(),
      ],
    }).catch(() => {});
    try { await msg.edit({ embeds: [new EmbedBuilder().setColor(0x555555).setDescription(`✅ claimed by **${m.author.username}**.`).setTimestamp()] }); } catch {}
  });

  collector?.on("end", (_: any, reason: string) => {
    if (reason === "time") {
      activeDrop.delete(guildId);
      msg.edit({ embeds: [new EmbedBuilder().setColor(0x555555).setDescription("💨 nobody claimed this drop in time.").setTimestamp()] }).catch(() => {});
    }
  });
}

export function startDropLoop(client: Client): void {
  async function scheduleNext() {
    const interval = randomInterval();
    setTimeout(async () => {
      try {
        const guilds = await db.select({ guildId: guildSettings.guildId, dropChannel: guildSettings.dropChannel })
          .from(guildSettings)
          .where(isNotNull(guildSettings.dropChannel));

        for (const { guildId, dropChannel } of guilds) {
          if (dropChannel) {
            await fireDrop(client, guildId, dropChannel).catch((err) => logger.error({ err }, "Drop failed"));
          }
        }
      } catch (err) {
        logger.error({ err }, "Drop loop error");
      }
      scheduleNext();
    }, interval);
  }

  scheduleNext();
  logger.info("🎁 drop loop started");
}

export async function fireDropManual(client: Client, guildId: string): Promise<boolean> {
  const rows = await db.select({ dropChannel: guildSettings.dropChannel }).from(guildSettings).where(eq(guildSettings.guildId, guildId)).limit(1);
  const channelId = rows[0]?.dropChannel;
  if (!channelId) return false;
  await fireDrop(client, guildId, channelId);
  return true;
}
