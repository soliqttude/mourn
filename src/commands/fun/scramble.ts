import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";

const WORDS = [
  "discord","gaming","javascript","typescript","channel","moderation",
  "adventure","legendary","champion",
  "moderator","developer","community","reaction","achievement",
  "prestige","giveaway","tournament","reputation","broadcast","confession",
  "minesweeper","trivia","scramble","treasure","starboard","voicemaster",
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
  name: "scramble",
  aliases: ["wordscramble", "unscramble"],
  description: "Unscramble the word before time runs out!"
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
        description: `unscramble this:\n\n# \`${sc}\`\n\nfirst one to type the correct word wins! ⏱ 30 seconds.`,
        page: "Fun",
      })],
    });

    const col = ctx.channel.createMessageCollector?.({
      filter: (m: any) => !m.author.bot && m.content.toLowerCase().trim() === word,
      time: 30_000,
      max: 1,
    });

    col?.on("collect", async (m: any) => {
      await m.reply({
        embeds: [successEmbed(`✅ **${m.author.username}** got it! the word was **${word}**.`)],
      });
    });

    col?.on("end", (c: any) => {
      if (!c.size) {
        ctx.followUp({ embeds: [errorEmbed(`⏰ time's up! the word was **${word}**.`)] }).catch(() => {});
      }
    });
  },
};
