import { EmbedBuilder, ComponentType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const STARTER_WORDS = ["apple", "orange", "elephant", "tiger", "rabbit", "zebra", "igloo", "ocean", "earth", "rain"];
const COMMON = new Set([
  "apple","orange","elephant","tiger","rabbit","zebra","igloo","ocean","earth","rain",
  "ant","net","top","pear","rice","egg","gorilla","angry","year","run","night","trunk",
  "king","game","eagle","lion","nail","lemon","mango","gold","dog","gun","noodle","eel",
  "lamp","potato","oak","key","yard","deer","rose","ear","arm","moon","nose","east","tuna",
  "acid","dark","koala","arrow","wolf","fox","x-ray","yak","kite","tree","end","dam","map",
  "pen","nun","nut","tower","rest","stone","elephant","tiger","rabbit","road","doctor",
]);

type Chain = { word: string; player: string }[];

const activeGames = new Map<string, { chain: Chain; lastLetter: string; started: number }>();

export const command: HybridCommand = {
  name: "wordchain",
  description: "Multiplayer word chain game! Each word must start with the last letter of the previous word.",
  category: "fun",
  guildOnly: true,
  aliases: ["chain", "wordgame"],
  async execute(ctx) {
    if (!ctx.channel) return;
    if (activeGames.has(ctx.channel.id))
      return ctx.reply({ content: "A word chain game is already running in this channel! Just type your word." });

    const starter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)]!;
    const chain: Chain = [{ word: starter, player: ctx.client.user?.username ?? "Bot" }];
    const game = { chain, lastLetter: starter.slice(-1), started: Date.now() };
    activeGames.set(ctx.channel.id, game);

    const makeEmbed = () => new EmbedBuilder()
      .setColor(0x8b0000)
      .setTitle("🔤 Word Chain Game")
      .setDescription([
        `**Starting word:** \`${starter}\``,
        "",
        "Type a word that **starts with** the last letter of the previous word.",
        "No repeats! First to fail loses.",
        "",
        `**Chain so far (${chain.length}):**`,
        chain.slice(-5).map(e => `\`${e.word}\` — ${e.player}`).join(" → "),
        "",
        `**Next letter: \`${game.lastLetter.toUpperCase()}\`**`,
        "Type your word now! (60 seconds)",
      ].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Word Chain` })
      .setTimestamp();

    await ctx.reply({ embeds: [makeEmbed()] });

    const used = new Set<string>([starter]);
    const channelRef = ctx.channel;

    const collector = channelRef.createMessageCollector({
      filter: m => !m.author.bot,
      time: 60000,
    });

    collector.on("collect", async msg => {
      const g = activeGames.get(channelRef.id);
      if (!g) return collector.stop();

      const word = msg.content.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (!word) return;

      if (word[0] !== g.lastLetter) {
        await msg.reply(`❌ **${msg.author.username}** failed! \`${word}\` doesn't start with **${g.lastLetter.toUpperCase()}**. Game over after ${g.chain.length} words!`);
        activeGames.delete(channelRef.id);
        return collector.stop();
      }
      if (used.has(word)) {
        await msg.reply(`❌ **${msg.author.username}** failed! \`${word}\` was already used! Game over after ${g.chain.length} words!`);
        activeGames.delete(channelRef.id);
        return collector.stop();
      }
      if (word.length < 2) {
        await msg.reply(`❌ Words must be at least 2 letters!`);
        return;
      }

      used.add(word);
      g.chain.push({ word, player: msg.author.username });
      g.lastLetter = word.slice(-1);
      collector.resetTimer();

      await msg.react("✅").catch(() => {});

      if (g.chain.length % 10 === 0) {
        await channelRef.send({ embeds: [makeEmbed()] }).catch(() => {});
      }
    });

    collector.on("end", (c) => {
      activeGames.delete(channelRef.id);
      if (c.size === 0 && activeGames.has(channelRef.id) === false) {
        channelRef.send({ embeds: [new EmbedBuilder().setColor(0x555555).setTitle("🔤 Word Chain Ended").setDescription(`Game timed out! The chain reached **${chain.length}** words.`).setFooter({ text: `${config.embedFooter} • Word Chain` })] }).catch(() => {});
      }
    });
  },
};
