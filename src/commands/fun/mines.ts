import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed, infoEmbed } from "../../lib/embeds.js";

type CellState = "hidden" | "gem" | "mine";

type MinesGame = {
  userId: string;
  bet: number;
  mines: number;
  board: CellState[];
  revealed: Set<number>;
  safeRevealed: number;
  over: boolean;
  won: boolean;
  createdAt: number;
};

const games = new Map<string, MinesGame>();

const BOARD_SIZE = 25;
const MULTIPLIERS: Record<number, number[]> = {
  1: [1.03, 1.08, 1.12, 1.18, 1.24, 1.3, 1.37, 1.46, 1.55, 1.65, 1.77, 1.9, 2.06, 2.25, 2.48, 2.75, 3.09, 3.54, 4.13, 4.95, 6.09, 7.8, 10.4, 14.56],
  2: [1.08, 1.17, 1.29, 1.43, 1.6, 1.8, 2.04, 2.34, 2.71, 3.18, 3.78, 4.54, 5.54, 6.88, 8.71, 11.35, 15.22, 21.11, 30.45, 46.4, 76.5, 140.25, 315.56],
  3: [1.12, 1.24, 1.39, 1.58, 1.81, 2.1, 2.47, 2.95, 3.58, 4.42, 5.58, 7.18, 9.5, 12.93, 18.2, 26.65, 40.73, 63.34, 103.9, 182.21, 350.41, 792.56],
  4: [1.18, 1.33, 1.53, 1.79, 2.12, 2.56, 3.12, 3.9, 4.95, 6.42, 8.5, 11.56, 16.23, 23.7, 36.33, 59.95, 108.12, 222.58, 540.56, 1621.68, 6486.72],
  5: [1.24, 1.43, 1.68, 2, 2.42, 2.98, 3.73, 4.78, 6.26, 8.39, 11.56, 16.5, 24.47, 37.93, 61.64, 106.11, 198.1, 412.71, 1031.78, 3439.28],
  6: [1.3, 1.53, 1.84, 2.25, 2.79, 3.54, 4.58, 6.1, 8.39, 11.88, 17.42, 26.38, 41.5, 68.48, 119.84, 228.27, 492.66, 1231.65, 3694.95],
  7: [1.37, 1.63, 1.99, 2.48, 3.16, 4.12, 5.51, 7.64, 10.99, 16.48, 25.89, 42.71, 75.54, 144.86, 310.42, 776.06, 2328.18, 9312.72],
  8: [1.46, 1.77, 2.21, 2.83, 3.72, 5.02, 6.98, 10.05, 15.08, 23.76, 39.59, 70.38, 135.73, 291.03, 727.58, 2182.74, 8729.94],
  9: [1.55, 1.9, 2.42, 3.16, 4.24, 5.89, 8.5, 12.75, 19.93, 32.39, 55.06, 99.11, 190.79, 404.03, 1010.08, 3030.26],
  10: [1.65, 2.06, 2.68, 3.58, 4.95, 7.1, 10.64, 16.63, 27.1, 46.07, 82.93, 159.49, 334.93, 781.5, 2344.5],
  11: [1.77, 2.25, 2.98, 4.09, 5.81, 8.66, 13.57, 22.42, 39.24, 73.95, 150.77, 335.04, 838.32, 2514.96],
  12: [1.9, 2.48, 3.39, 4.83, 7, 10.7, 17.33, 29.74, 54.53, 108.12, 237.87, 594.67, 1784],
  13: [2.06, 2.75, 3.9, 5.73, 8.66, 13.79, 23.39, 42.11, 81.95, 176.7, 441.76, 1325.28],
  14: [2.25, 3.09, 4.58, 6.98, 10.99, 17.99, 31.49, 58.48, 117.35, 263.05, 684.4],
  15: [2.48, 3.54, 5.51, 8.81, 14.71, 26.48, 50.31, 101.64, 228.69, 610.9],
  16: [2.75, 4.13, 6.72, 11.26, 20.27, 39.18, 81.63, 190.47, 507.93],
  17: [3.09, 4.95, 8.39, 15.08, 29.02, 60.11, 141.39, 395.89],
  18: [3.54, 6.09, 10.92, 21.11, 43.94, 102.52, 287.08],
  19: [4.13, 7.8, 15.21, 31.7, 74.63, 223.9],
  20: [4.95, 10.4, 22.88, 54.91, 164.74],
  21: [6.19, 14.56, 37.85, 113.56],
  22: [7.8, 21.84, 87.38],
  23: [10.4, 35.56],
  24: [16.5],
};

function createBoard(mines: number): CellState[] {
  const board: CellState[] = Array.from({ length: BOARD_SIZE }, () => "gem");
  const used = new Set<number>();
  while (used.size < mines) {
    const index = Math.floor(Math.random() * BOARD_SIZE);
    if (used.has(index)) continue;
    used.add(index);
    board[index] = "mine";
  }
  return board;
}

function getMultiplier(mines: number, safeRevealed: number): number {
  const table = MULTIPLIERS[mines];
  if (!table || safeRevealed <= 0) return 1;
  return table[safeRevealed - 1] ?? 1;
}

function formatBoard(game: MinesGame, revealAll = false): string {
  const rows: string[] = [];
  for (let y = 0; y < 5; y++) {
    const cols: string[] = [];
    for (let x = 0; x < 5; x++) {
      const index = y * 5 + x;
      const cell = game.board[index];
      if (revealAll || game.revealed.has(index)) {
        cols.push(cell === "mine" ? "💣" : "💎");
      } else {
        cols.push("⬛");
      }
    }
    rows.push(cols.join(" "));
  }
  return rows.join("\n");
}

function parsePick(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    if (num >= 1 && num <= 25) return num - 1;
  }

  const match = cleaned.match(/^([a-e])([1-5])$/);
  if (match) {
    const col = match[1].charCodeAt(0) - 97;
    const row = parseInt(match[2], 10) - 1;
    return row * 5 + col;
  }

  return null;
}

function buildGameEmbed(game: MinesGame, title?: string) {
  const multiplier = getMultiplier(game.mines, game.safeRevealed);
  const cashout = game.safeRevealed > 0 ? (game.bet * multiplier).toFixed(2) : "0.00";
  return brandEmbed({
    title: title ?? "💣 Mines",
    description: [
      "```ansi",
      "[1;32mStake-style Mines[0m",
      "```",
      formatBoard(game, game.over),
      "",
      `**Bet:** ${game.bet.toFixed(2)}`,
      `**Mines:** ${game.mines}`,
      `**Safe Gems Found:** ${game.safeRevealed}`,
      `**Multiplier:** x${multiplier.toFixed(2)}`,
      `**Cashout Value:** ${cashout}`,
      "",
      "**How to play**",
      "• `/mines action:start bet:<amount> mines:<1-24>`",
      "• `/mines action:pick tile:<1-25 or a1-e5>`",
      "• `/mines action:cashout`",
    ].join("\n"),
    fields: [
      { name: "Tile Map", value: "`1  2  3  4  5`\n`6  7  8  9 10`\n`11 12 13 14 15`\n`16 17 18 19 20`\n`21 22 23 24 25`", inline: true },
      { name: "Coordinates", value: "`a1 b1 c1 d1 e1`\n`a2 b2 c2 d2 e2`\n`a3 b3 c3 d3 e3`\n`a4 b4 c4 d4 e4`\n`a5 b5 c5 d5 e5`", inline: true },
    ],
    page: "Fun",
    user: game.userId as never,
  });
}

export const command: HybridCommand = {
  name: "mines",
  description: "Play a fully functional mines gambling game.",
  category: "fun",
  aliases: ["mine"],
  options: [
    {
      name: "action",
      description: "What you want to do in mines",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "start", value: "start" },
        { name: "pick", value: "pick" },
        { name: "cashout", value: "cashout" },
        { name: "end", value: "end" },
      ],
    },
    {
      name: "bet",
      description: "Bet amount for starting a game",
      type: ApplicationCommandOptionType.Number,
      required: false,
    },
    {
      name: "mines",
      description: "How many mines to place (1-24)",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "tile",
      description: "Tile to pick (1-25 or a1-e5)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async execute(ctx) {
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const userId = ctx.user.id;
    const current = games.get(userId);

    if (!["start", "pick", "cashout", "end"].includes(action)) {
      return ctx.reply({ embeds: [errorEmbed("Invalid action. Use start, pick, cashout, or end.")] });
    }

    if (action === "start") {
      if (current && !current.over) {
        return ctx.reply({ embeds: [errorEmbed("You already have an active mines game. Use `/mines action:pick`, `/mines action:cashout`, or `/mines action:end`.")] });
      }

      const bet = ctx.getNumber("bet") ?? (ctx.args[1] ? Number(ctx.args[1]) : null);
      const mines = (ctx.getNumber("mines") ?? (ctx.args[2] ? Number(ctx.args[2]) : null)) as number | null;

      if (bet === null || Number.isNaN(bet)) {
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid bet amount.")] });
      }

      if (mines === null || Number.isNaN(mines)) {
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid mine count between 1 and 24.")] });
      }

      if (bet <= 0) {
        return ctx.reply({ embeds: [errorEmbed("Bet amount must be greater than 0.")] });
      }

      if (!Number.isFinite(bet) || bet > 1_000_000_000) {
        return ctx.reply({ embeds: [errorEmbed("Bet amount is too large.")] });
      }

      if (mines < 1 || mines > 24) {
        return ctx.reply({ embeds: [errorEmbed("Mine count must be between 1 and 24.")] });
      }

      const game: MinesGame = {
        userId,
        bet,
        mines,
        board: createBoard(mines),
        revealed: new Set(),
        safeRevealed: 0,
        over: false,
        won: false,
        createdAt: Date.now(),
      };

      games.set(userId, game);

      return ctx.reply({
        embeds: [
          buildGameEmbed(game, "💣 Mines Started"),
        ],
      });
    }

    if (!current || current.over) {
      return ctx.reply({ embeds: [errorEmbed("You do not have an active mines game. Start one with `/mines action:start`.")] });
    }

    if (action === "pick") {
      const tileInput = ctx.getString("tile") ?? ctx.args[1];
      const pickedIndex = parsePick(tileInput);

      if (pickedIndex === null) {
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid tile from 1-25 or a1-e5.")] });
      }

      if (current.revealed.has(pickedIndex)) {
        return ctx.reply({ embeds: [errorEmbed("That tile has already been revealed. Pick a different tile.")] });
      }

      current.revealed.add(pickedIndex);

      if (current.board[pickedIndex] === "mine") {
        current.over = true;
        current.won = false;
        games.set(userId, current);

        return ctx.reply({
          embeds: [
            brandEmbed({
              title: "💥 Boom! You hit a mine",
              description: [
                formatBoard(current, true),
                "",
                `**Bet Lost:** ${current.bet.toFixed(2)}`,
                `**Mines:** ${current.mines}`,
                `**Safe Gems Found:** ${current.safeRevealed}`,
              ].join("\n"),
              page: "Fun",
            }),
          ],
        });
      }

      current.safeRevealed += 1;

      const maxSafe = BOARD_SIZE - current.mines;
      if (current.safeRevealed >= maxSafe) {
        current.over = true;
        current.won = true;
        const payout = current.bet * getMultiplier(current.mines, current.safeRevealed);
        games.set(userId, current);

        return ctx.reply({
          embeds: [
            brandEmbed({
              title: "🏆 Perfect Clear",
              description: [
                formatBoard(current, true),
                "",
                `**Bet:** ${current.bet.toFixed(2)}`,
                `**Multiplier:** x${getMultiplier(current.mines, current.safeRevealed).toFixed(2)}`,
                `**Payout:** ${payout.toFixed(2)}`,
              ].join("\n"),
              page: "Fun",
            }),
          ],
        });
      }

      games.set(userId, current);
      return ctx.reply({
        embeds: [
          buildGameEmbed(current, "💎 Safe Pick"),
        ],
      });
    }

    if (action === "cashout") {
      if (current.safeRevealed < 1) {
        return ctx.reply({ embeds: [errorEmbed("You need to reveal at least one safe gem before cashing out.")] });
      }

      current.over = true;
      current.won = true;
      const multiplier = getMultiplier(current.mines, current.safeRevealed);
      const payout = current.bet * multiplier;
      games.set(userId, current);

      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "💰 Cashed Out",
            description: [
              formatBoard(current, true),
              "",
              `**Bet:** ${current.bet.toFixed(2)}`,
              `**Safe Gems Found:** ${current