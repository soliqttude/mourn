import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const WORDS = [
  "javascript","discord","economy","adventure","champion","inventory","community",
  "moderator","developer","reaction","starboard","prestige","giveaway","confession",
  "minesweeper","gambling","legendary","achievement","multiplier","broadcast",
];
const STAGES = [
  "```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```",
];

export const command: HybridCommand = {
  name: "hangman",
  description: "Play hangman! Guess the letters to reveal the word.",
  category: "fun",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel || !ctx.guild) return;

    const word = WORDS[Math.floor(Math.random() * WORDS.length)]!;
    const guessed = new Set<string>();
    let wrong = 0;
    const MAX_WRONG = 6;
    const REWARD = 150;

    const display = () => word.split("").map(c => (guessed.has(c) ? c : "_")).join(" ");
    const uniqueLetters = [...new Set(word.split(""))];
    const alphabetRows = ["abcdefghij", "klmnopqrst", "uvwxyz"].map(row =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        row.split("").filter(c => uniqueLetters.includes(c) || row.length <= 10).map(c =>
          new ButtonBuilder()
            .setCustomId(`hm_${c}_${ctx.user.id}`)
            .setLabel(c.toUpperCase())
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(guessed.has(c))
        ).slice(0, 5)
      )
    ).filter(r => r.components.length > 0);

    const buildEmbed = (status: string) =>
      new EmbedBuilder()
        .setColor(wrong >= MAX_WRONG ? config.errorColor : config.brandColor)
        .setTitle("🪢 hangman")
        .addFields(
          { name: "word", value: `\`${display()}\``, inline: true },
          { name: "wrong guesses", value: `${wrong}/${MAX_WRONG}`, inline: true },
          { name: "gallows", value: STAGES[wrong]!, inline: false },
          { name: "status", value: status, inline: false },
        )
        .setFooter({ text: `${config.embedFooter} • fun` })
        .setTimestamp();

    const msg = await ctx.reply({
      embeds: [buildEmbed("guess a letter!")],
      components: alphabetRows.slice(0, 3) as any,
    }) as any;

    const msgObj = ctx.source === "slash"
      ? await (ctx.raw as any).fetchReply()
      : msg;

    const collector = msgObj?.createMessageComponentCollector?.({
      filter: (i: any) => i.customId.startsWith("hm_") && i.user.id === ctx.user.id,
      time: 120_000,
    });

    collector?.on("collect", async (i: any) => {
      const letter = i.customId.split("_")[1] as string;
      if (guessed.has(letter)) { await i.deferUpdate().catch(() => {}); return; }
      guessed.add(letter);
      if (!word.includes(letter)) wrong++;

      const won = uniqueLetters.every(c => guessed.has(c));
      const lost = wrong >= MAX_WRONG;

      let status = won ? `✅ you got it! the word was **${word}**. +${REWARD} coins!` : lost ? `💀 you lost! the word was **${word}**.` : "keep guessing...";

      if (won && ctx.guild) await addBalance(ctx.guild.id, ctx.user.id, REWARD);

      await i.update({
        embeds: [buildEmbed(status)],
        components: won || lost ? [] : alphabetRows.map(r =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            r.components.map((b: any) => b.setDisabled(guessed.has(b.data.custom_id?.split("_")[1] ?? "")))
          )
        ).filter(r => r.components.length > 0).slice(0, 3) as any,
      }).catch(() => {});

      if (won || lost) collector.stop();
    });

    collector?.on("end", (_: any, reason: string) => {
      if (reason === "time") {
        ctx.followUp({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`⏰ hangman timed out. the word was **${word}**.`).setTimestamp()] }).catch(() => {});
      }
    });
  },
};
