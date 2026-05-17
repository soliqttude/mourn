import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

type Board = (string | null)[];
const games = new Map<string, { board: Board; turn: string; p1: string; p2: string; symbol1: string; symbol2: string }>();

function makeBoard(board: Board, p1: string, p2: string) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const val = board[idx];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_${idx}_${p1}_${p2}`)
          .setLabel(val ?? "·")
          .setStyle(val === "❌" ? ButtonStyle.Danger : val === "⭕" ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!!val)
      );
    }
    rows.push(row);
  }
  return rows;
}

function checkWin(board: Board, sym: string): boolean {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return wins.some(w => w.every(i => board[i] === sym));
}

export const command: HybridCommand = {
  name: "tictactoe",
  description: "Play Tic-Tac-Toe with someone.",
  usage: "tictactoe [user]",
  examples: ["tictactoe"],
  category: "fun",
  guildOnly: true,
  aliases: ["ttt"],
  options: [{ name: "user", description: "Opponent", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const opponent = await ctx.getUser("user", true);
    if (!opponent) return;
    if (opponent.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't play against yourself.")] });
    if (opponent.bot) return ctx.reply({ embeds: [errorEmbed("You can't play against a bot.")] });
    const board: Board = Array(9).fill(null);
    const gameId = `${ctx.user.id}_${opponent.id}`;
    games.set(gameId, { board, turn: ctx.user.id, p1: ctx.user.id, p2: opponent.id, symbol1: "❌", symbol2: "⭕" });
    const rows = makeBoard(board, ctx.user.id, opponent.id);
    return ctx.reply({
      embeds: [brandEmbed({ title: "Tic-Tac-Toe", description: `<@${ctx.user.id}> ❌ vs <@${opponent.id}> ⭕\n<@${ctx.user.id}>'s turn!`, page: "Fun" })],
      components: rows as any,
    });
  },
};
