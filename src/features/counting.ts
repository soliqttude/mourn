import type { Client, Message } from "discord.js";
import { db } from "../db/index.js";
import { countingData } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { eq } from "drizzle-orm";

export async function handleCounting(client: Client, message: Message) {
  if (!message.guild || message.author.bot) return;
  const settings = await getGuildSettings(message.guild.id);
  if (!settings.countingChannel || message.channel.id !== settings.countingChannel) return;
  const rows = await db.select().from(countingData).where(eq(countingData.guildId, message.guild.id));
  const data = rows[0];
  if (!data) return;
  const expected = (data.count ?? 0) + 1;
  const num = parseInt(message.content.trim());
  if (isNaN(num) || num !== expected) {
    if (!isNaN(num)) {
      await message.react("❌").catch(() => {});
      await message.reply(`❌ Wrong number! The count was **${data.count}** — back to **0**. (Expected **${expected}**)`).catch(() => {});
      await db.update(countingData).set({ count: 0, lastUserId: null }).where(eq(countingData.guildId, message.guild.id));
    }
    return;
  }
  if (data.lastUserId === message.author.id) {
    await message.react("❌").catch(() => {});
    await message.reply(`❌ You can't count twice in a row! Count reset to **0**.`).catch(() => {});
    await db.update(countingData).set({ count: 0, lastUserId: null }).where(eq(countingData.guildId, message.guild.id));
    return;
  }
  const newHigh = Math.max(data.highScore ?? 0, num);
  await db.update(countingData).set({ count: num, lastUserId: message.author.id, highScore: newHigh }).where(eq(countingData.guildId, message.guild.id));
  await message.react("✅").catch(() => {});
  if (num % 100 === 0) {
    await message.reply(`🎉 **${num}!** Keep going!`).catch(() => {});
  }
}
