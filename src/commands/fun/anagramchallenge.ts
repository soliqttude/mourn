import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const AUTO_WORDS = [
  "javascript","discord","economy","adventure","champion","inventory","community",
  "moderator","developer","reaction","starboard","prestige","giveaway","legendary",
];

function shuffle(w: string): string {
  const a = w.split("");
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.join("");
}

export const command: HybridCommand = {
  name: "anagramchallenge",
  description: "Challenge someone to solve an anagram (first to type it wins coins).",
  category: "fun",
  guildOnly: true,
  aliases: ["anagram"],
  options: [
    { name: "word", description: "The word to scramble (leave blank for a random one)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.channel || !ctx.guild) return;
    const raw = ctx.getString("word") ?? ctx.rawArgs?.trim();
    const word = raw?.toLowerCase().replace(/\s+/g, "") || AUTO_WORDS[Math.floor(Math.random() * AUTO_WORDS.length)]!;

    if (word.length < 3) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("word must be at least 3 letters.")] });
    if (word.length > 30) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("keep it under 30 characters.")] });

    let sc = shuffle(word);
    while (sc === word) sc = shuffle(word);

    const REWARD = Math.max(50, word.length * 15);

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("🔠 anagram challenge")
          .setDescription(`unscramble: **\`${sc}\`**\n\nfirst to type the correct word wins **${REWARD} coins**! 45 seconds.`)
          .setFooter({ text: `${config.embedFooter} • set by ${ctx.user.username}` })
          .setTimestamp(),
      ],
    });

    const col = ctx.channel.createMessageCollector?.({
      filter: (m: any) => !m.author.bot && m.content.toLowerCase().trim() === word,
      time: 45_000,
      max: 1,
    });

    col?.on("collect", async (m: any) => {
      if (ctx.guild) await addBalance(ctx.guild.id, m.author.id, REWARD);
      await m.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.successColor)
            .setDescription(`✅ **${m.author.username}** got it! the word was **${word}**. +${REWARD} coins 🪙`)
            .setTimestamp(),
        ],
      });
    });

    col?.on("end", (c: any) => {
      if (!c.size) {
        ctx.followUp({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`⏰ time's up! the word was **${word}**.`).setTimestamp()] }).catch(() => {});
      }
    });
  },
};
