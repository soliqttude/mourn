import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

const WORDS = [
  "discord","gaming","javascript","typescript","channel","moderation","economy",
  "leaderboard","gambling","multiplier","adventure","legendary","champion",
  "inventory","moderator","developer","community","reaction","achievement",
  "prestige","giveaway","tournament","reputation","broadcast","confession",
  "minesweeper","trivia","scramble","treasure","starboard","voicemaster",
];
const COIN_REWARD = 75;

function shuffle(w: string): string {
  const a = w.split("");
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.join("");
}

export const command: HybridCommand = {
  name: "scramble",
  aliases: ["wordscramble", "unscramble"],
  description: "Unscramble the word before time runs out! First correct answer wins coins.",
  usage: "scramble",
  examples: ["scramble"],
  category: "fun",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel || !ctx.guild) return;
    const word = WORDS[Math.floor(Math.random() * WORDS.length)]!;
    let sc = shuffle(word);
    while (sc === word) sc = shuffle(word);

    await ctx.reply({
      embeds: [brandEmbed({
        title: "🔀 word scramble",
        description: `unscramble this:\n\n# \`${sc}\`\n\nfirst one to type the correct word wins **${COIN_REWARD} coins**! ⏱ 30 seconds.`,
        page: "Fun",
      })],
    });

    const col = ctx.channel.createMessageCollector?.({
      filter: (m: any) => !m.author.bot && m.content.toLowerCase().trim() === word,
      time: 30_000,
      max: 1,
    });

    col?.on("collect", async (m: any) => {
      if (ctx.guild) await addBalance(ctx.guild.id, m.author.id, COIN_REWARD);
      await m.reply({
        embeds: [successEmbed(`✅ **${m.author.username}** got it! the word was **${word}**. +${COIN_REWARD} coins 🪙`)],
      });
    });

    col?.on("end", (c: any) => {
      if (!c.size) {
        ctx.followUp({ embeds: [errorEmbed(`⏰ time's up! the word was **${word}**.`)] }).catch(() => {});
      }
    });
  },
};
