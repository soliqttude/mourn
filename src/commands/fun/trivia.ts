import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  difficulty: string;
}

function decode(str: string): string {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

const REWARDS: Record<string, number> = { easy: 50, medium: 100, hard: 175 };

export const command: HybridCommand = {
  name: "trivia",
  description: "Answer a random trivia question and win coins.",
  category: "fun",
  async execute(ctx) {
    try {
      const res = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
      const data = await res.json() as { results: TriviaQuestion[] };
      const q = data.results[0];
      if (!q) return ctx.reply({ embeds: [errorEmbed("couldn't fetch a question right now.")] });

      const diff = decode(q.difficulty).toLowerCase();
      const reward = REWARDS[diff] ?? 50;
      const guildId = ctx.guild?.id ?? "0";

      const answers = [...q.incorrect_answers, q.correct_answer].map(decode).sort(() => Math.random() - 0.5);
      const labels = ["A", "B", "C", "D"];
      const correctLabel = labels[answers.indexOf(decode(q.correct_answer))];

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        answers.map((ans, i) =>
          new ButtonBuilder()
            .setCustomId(`trivia_${labels[i]}_${correctLabel}_${ctx.user.id}_${reward}_${guildId}`)
            .setLabel(`${labels[i]}: ${ans}`)
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await ctx.reply({
        embeds: [brandEmbed({
          title: `trivia — ${diff.toUpperCase()} (+${reward} coins)`,
          description: `**category:** ${decode(q.category)}\n\n${decode(q.question)}`,
          page: "Trivia",
        })],
        components: [row as any],
      });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("couldn't fetch trivia right now.")] });
    }
  },
};
