import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed, infoEmbed } from "../../lib/embeds.js";

type CellState = "hidden" | "safe" | "mine";

type MinesGame = {
  userId: string;
  bet: number;
  mines: number;
  size: number;
  board: boolean[];
  revealed: Set<number>;
  finished: boolean;
  cashedOut: boolean;
  startedAt: number;
};

const activeGames = new Map<string, MinesGame>();

function createBoard(size: number, mineCount: number) {
  const total = size * size;
  const board = new Array<boolean>(total).fill(false);
  let placed = 0;

  while (placed < mineCount) {
    const index = Math.floor(Math.random() * total);
    if (board[index]) continue;
    board[index] = true;
    placed++;
  }

  return board;
}

function getMultiplier(revealedSafe: number, mineCount: number, totalCells: number) {
  let multiplier = 1;
  for (let i = 0; i < revealedSafe; i++) {
    multiplier *= (totalCells - i) / (totalCells - mineCount - i);
  }
  return Math.max(1, multiplier * 0.96);
}

function formatBoard(game: MinesGame, revealAll = false) {
  const rows: string[] = [];
  const total = game.size * game.size;

  for (let y = 0; y < game.size; y++) {
    const row: string[] = [];
    for (let x = 0; x < game.size; x++) {
      const index = y * game.size + x;
      const isMine = game.board[index];
      const isRevealed = game.revealed.has(index);

      if (revealAll) {
        row.push(isMine ? "💣" : isRevealed ? "💎" : "⬜");
      } else {
        row.push(isRevealed ? "💎" : "🟦");
      }
    }
    rows.push(row.join(" "));
  }

  return rows.join("\n");
}

function createGridButtons(game: MinesGame) {
  const rows: any[] = [];

  for (let y = 0; y < game.size; y++) {
    const components: any[] = [];

    for (let x = 0; x < game.size; x++) {
      const index = y * game.size + x;
      const revealed = game.revealed.has(index);

      components.push({
        type: 2,
        custom_id: `mines:${game.userId}:${index}`,
        label: revealed ? "💎" : " ",
        style: revealed ? 3 : 2,
        disabled: game.finished || revealed,
      });
    }

    rows.push({ type: 1, components });
  }

  rows.push({
    type: 1,
    components: [
      {
        type: 2,
        custom_id: `mines_cashout:${game.userId}`,
        label: "Cash Out",
        style: 1,
        disabled: game.finished || game.revealed.size === 0,
      },
      {
        type: 2,
        custom_id: `mines_stop:${game.userId}`,
        label: "End Game",
        style: 4,
        disabled: game.finished,
      },
    ],
  });

  return rows;
}

function createGameEmbed(game: MinesGame, status?: string) {
  const totalCells = game.size * game.size;
  const safeRevealed = game.revealed.size;
  const multiplier = getMultiplier(safeRevealed, game.mines, totalCells);
  const payout = Math.floor(game.bet * multiplier);

  return brandEmbed({
    title: "💣 Mines",
    description: [
      formatBoard(game, game.finished),
      "",
      status ?? "Pick tiles and avoid the mines.",
    ].join("\n"),
    fields: [
      { name: "Bet", value: `**${game.bet}** coins`, inline: true },
      { name: "Mines", value: `**${game.mines}**`, inline: true },
      { name: "Safe Gems", value: `**${safeRevealed}**`, inline: true },
      { name: "Multiplier", value: `**${multiplier.toFixed(2)}x**`, inline: true },
      { name: "Cash Out Value", value: `**${payout}** coins`, inline: true },
      { name: "Grid", value: `**${game.size}x${game.size}**`, inline: true },
    ],
    page: "Fun",
  });
}

export const command: HybridCommand = {
  name: "mines",
  description: "Start an interactive mines game with buttons.",
  category: "fun",
  options: [
    {
      name: "bet",
      description: "Amount to bet",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "mines",
      description: "How many mines to place (1-10)",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
  ],
  async execute(ctx) {
    const bet = (ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "", 10)) || 100;
    const mineCount = (ctx.getNumber("mines") ?? parseInt(ctx.args[1] ?? "", 10)) || 3;

    if (!Number.isInteger(bet) || bet < 1) {
      return ctx.reply({ embeds: [errorEmbed("Bet must be a whole number greater than 0.")] });
    }

    if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount > 10) {
      return ctx.reply({ embeds: [errorEmbed("Mines must be a whole number between 1 and 10.")] });
    }

    if (activeGames.has(ctx.user.id)) {
      return ctx.reply({ embeds: [errorEmbed("You already have an active mines game. Finish it before starting a new one.")] });
    }

    const size = 5;
    const totalCells = size * size;

    if (mineCount >= totalCells) {
      return ctx.reply({ embeds: [errorEmbed("There must be at least one safe tile on the board.")] });
    }

    const game: MinesGame = {
      userId: ctx.user.id,
      bet,
      mines: mineCount,
      size,
      board: createBoard(size, mineCount),
      revealed: new Set(),
      finished: false,
      cashedOut: false,
      startedAt: Date.now(),
    };

    activeGames.set(ctx.user.id, game);

    return ctx.reply({
      embeds: [
        createGameEmbed(
          game,
          "Click the buttons below to reveal tiles. Cash out before you hit a mine.",
        ),
      ],
      components: createGridButtons(game),
    } as any);
  },
};