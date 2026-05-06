import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed, infoEmbed } from "../../lib/embeds.js";

type CellState = "hidden" | "gem" | "mine";

type MinesGame = {
  userId: string;
  stake: number;
  mines: number;
  board: CellState[];
  revealed: Set<number>;
  safeLeft: number;
  multiplier: number;
  profit: number;
  active: boolean;
};

const activeGames = new Map<string, MinesGame>();

const BOARD_SIZE = 25;
const MIN_MINES = 1;
const MAX_MINES = 24;

function formatMoney(amount: number) {
  return `${amount.toFixed(2)} coins`;
}

function createBoard(mines: number) {
  const board: CellState[] = Array.from({ length: BOARD_SIZE }, () => "gem");
  const used = new Set<number>();

  while (used.size < mines) {
    used.add(Math.floor(Math.random() * BOARD_SIZE));
  }

  for (const index of used) board[index] = "mine";
  return board;
}

function getMultiplier(mines: number, revealed: number) {
  let multiplier = 1;
  const totalSafe = BOARD_SIZE - mines;

  for (let i = 0; i < revealed; i++) {
    multiplier *= (totalSafe - i) / (BOARD_SIZE - i);
  }

  const edgeAdjusted = (1 / multiplier) * 0.97;
  return Number(edgeAdjusted.toFixed(2));
}

function renderBoard(game: MinesGame, revealAll = false) {
  const rows: string[] = [];

  for (let row = 0; row < 5; row++) {
    const cells: string[] = [];

    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col;
      const revealed = game.revealed.has(index);

      if (revealAll) {
        cells.push(game.board[index] === "mine" ? "💣" : "💎");
        continue;
      }

      if (!revealed) {
        cells.push("🟦");
        continue;
      }

      cells.push(game.board[index] === "mine" ? "💣" : "💎");
    }

    rows.push(cells.join(" "));
  }

  return rows.join("\n");
}

function parseCell(input: string | undefined) {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();

  if (/^\d+$/.test(normalized)) {
    const num = parseInt(normalized, 10);
    if (num >= 1 && num <= 25) return num - 1;
  }

  const match = normalized.match(/^([a-e])([1-5])$/);
  if (!match) return null;

  const col = match[1].charCodeAt(0) - 97;
  const row = parseInt(match[2], 10) - 1;
  return row * 5 + col;
}

function boardLegend() {
  return "Pick tiles with `,mines reveal <tile>` using `1-25` or coordinates like `a1`, `c3`, `e5`.\nCash out anytime with `,mines cashout`.";
}

export const command: HybridCommand = {
  name: "mines",
  description: "Play a Stake-style mines game on a 5x5 board.",
  category: "fun",
  aliases: ["mine"],
  options: [
    { name: "stake", description: "Amount to bet", type: ApplicationCommandOptionType.Number, required: false },
    { name: "mines", description: "How many mines to place", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    const subcommand = (ctx.args[0] ?? "").toLowerCase();

    if (!subcommand) {
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "💣 Mines",
            description:
              "Stake-style mines game.\n\n" +
              "` ,mines start <stake> <mines>` - Start a new game\n" +
              "` ,mines reveal <tile>` - Reveal a tile\n" +
              "` ,mines cashout` - Secure your winnings\n" +
              "` ,mines board` - View your current board\n" +
              "` ,mines end` - Cancel your current game",
            page: "Fun",
            user: ctx.user,
            guild: ctx.guild ?? undefined,
          }),
        ],
      });
    }

    const existing = activeGames.get(ctx.user.id);

    if (subcommand === "start") {
      if (existing?.active) {
        return ctx.reply({ embeds: [errorEmbed("You already have an active mines game. Use `,mines board`, `,mines reveal <tile>`, or `,mines cashout`.")] });
      }

      const stake = Number(ctx.args[1] ?? ctx.getNumber("stake"));
      const mines = Number(ctx.args[2] ?? ctx.getNumber("mines"));

      if (!Number.isFinite(stake) || stake <= 0) {
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid stake amount. Example: `,mines start 100 3`")] });
      }

      if (!Number.isInteger(mines) || mines < MIN_MINES || mines > MAX_MINES) {
        return ctx.reply({ embeds: [errorEmbed("Mines must be an integer between 1 and 24.")] });
      }

      const board = createBoard(mines);
      const game: MinesGame = {
        userId: ctx.user.id,
        stake,
        mines,
        board,
        revealed: new Set(),
        safeLeft: BOARD_SIZE - mines,
        multiplier: 1,
        profit: 0,
        active: true,
      };

      activeGames.set(ctx.user.id, game);

      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "💣 Mines — New Game",
            description: `${renderBoard(game)}\n\n${boardLegend()}`,
            fields: [
              { name: "Stake", value: formatMoney(stake), inline: true },
              { name: "Mines", value: `${mines}`, inline: true },
              { name: "Multiplier", value: `${game.multiplier.toFixed(2)}x`, inline: true },
              { name: "Potential Cashout", value: formatMoney(stake * game.multiplier), inline: true },
              { name: "Safe Tiles Left", value: `${game.safeLeft}`, inline: true },
              { name: "Revealed", value: `${game.revealed.size}`, inline: true },
            ],
            page: "Fun",
            user: ctx.user,
            guild: ctx.guild ?? undefined,
          }),
        ],
      });
    }

    if (subcommand === "board") {
      if (!existing?.active) {
        return ctx.reply({ embeds: [errorEmbed("You do not have an active mines game. Start one with `,mines start <stake> <mines>`.")] });
      }

      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "💣 Mines — Current Board",
            description: `${renderBoard(existing)}\n\n${boardLegend()}`,
            fields: [
              { name: "Stake", value: formatMoney(existing.stake), inline: true },
              { name: "Mines", value: `${existing.mines}`, inline: true },
              { name: "Multiplier", value: `${existing.multiplier.toFixed(2)}x`, inline: true },
              { name: "Potential Cashout", value: formatMoney(existing.stake * existing.multiplier), inline: true },
              { name: "Safe Tiles Left", value: `${existing.safeLeft}`, inline: true },
              { name: "Revealed", value: `${existing.revealed.size}`, inline: true },
            ],
            page: "Fun",
            user: ctx.user,
            guild: ctx.guild ?? undefined,
          }),
        ],
      });
    }

    if (subcommand === "reveal" || subcommand === "pick") {
      if (!existing?.active) {
        return ctx.reply({ embeds: [errorEmbed("You do not have an active mines game. Start one with `,mines start <stake> <mines>`.")] });
      }

      const cell = parseCell(ctx.args[1]);
      if (cell === null) {
        return ctx.reply({ embeds: [errorEmbed("Please provide a valid tile to reveal. Use `1-25` or coordinates like `a1`, `c3`, `e5`.")] });
      }

      if (existing.revealed.has(cell)) {
        return ctx.reply({ embeds: [errorEmbed("That tile has already been revealed. Pick a different tile.")] });
      }

      existing.revealed.add(cell);

      if (existing.board[cell] === "mine") {
        existing.active = false;
        activeGames.delete(ctx.user.id);

        return ctx.reply({
          embeds: [
            brandEmbed({
              title: "💥 Mines — Busted",
              description: `${renderBoard(existing, true)}\n\nYou hit a mine and lost your stake.`,
              fields: [
                { name: "Stake Lost", value: formatMoney(existing.stake), inline: true },
                { name: "Mines", value: `${existing.mines}`, inline: true },
                { name: "Final Multiplier", value: `${existing.multiplier.toFixed(2)}x`, inline: true },
              ],
              page: "Fun",
              user: ctx.user,
              guild: ctx.guild ?? undefined,
            }),
          ],
        });
      }

      existing.safeLeft -= 1;
      existing.multiplier = getMultiplier(existing.mines, existing.revealed.size);
      existing.profit = Number((existing.stake * existing.multiplier - existing.stake).toFixed(2));

      if (existing.safeLeft === 0) {
        const payout = Number((existing.stake * existing.multiplier).toFixed(2));
        existing.active = false;
        activeGames.delete(ctx.user.id);

        return ctx.reply({
          embeds: [
            brandEmbed({
              title: "🏆 Mines — Cleared Board",
              description: `${renderBoard(existing, true)}\n\nYou revealed every safe tile and completed the board.`,
              fields: [
                { name: "Stake", value: formatMoney(existing.stake), inline: true },
                { name: "Final Multiplier", value: `${existing.multiplier.toFixed(2)}x`, inline: true },
                { name: "Payout", value: formatMoney(payout), inline: true },
              ],
              page: "Fun",
              user: ctx.user,
              guild: ctx.guild ?? undefined,
            }),
          ],
        });
      }

      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "💎 Mines — Safe Pick",
            description: `${renderBoard(existing)}\n\nSafe tile found. Reveal another or cash out now.`,
            fields: [
              { name: "Stake", value: formatMoney(existing.stake), inline: true },
              { name: "Current Multiplier", value: `${existing.multiplier.toFixed(2)}x`, inline: true },
              { name: "Current Profit", value: formatMoney(existing.profit), inline: true },
              { name: "Potential Cashout", value: formatMoney(existing.stake * existing.multiplier), inline: true },
              { name: "Safe Tiles Left", value: `${existing.safeLeft}`, inline: true },
              { name: "Revealed", value: `${existing.revealed.size}`, inline: true },
            ],
            page: "Fun",
            user: ctx.user,
            guild: ctx.guild ?? undefined,
          }),
        ],
      });
    }

    if (subcommand === "cashout" || subcommand === "cash") {
      if (!existing?.active) {
        return ctx.reply({ embeds: [errorEmbed("You do not have an active mines game to cash out.")] });
      }

      if (existing.revealed.size === 0) {
        return ctx.reply({ embeds: [errorEmbed("You need to reveal at least one safe tile before cashing out.")] });
      }

      const payout = Number((existing.stake * existing.multiplier).toFixed(2));
      const profit = Number((payout - existing.stake).toFixed(2));
      existing.active = false;
      activeGames.delete(ctx.user.id);

      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "💰 Mines — Cashed Out",
            description: `${renderBoard(existing)}\n\nYou safely cashed out your game.`,
            fields: [
              { name: "Stake", value: formatMoney(existing.stake), inline: true },
              { name: "Multiplier", value: `${existing.multiplier.toFixed(2)}x`, inline: true },
              { name: "Payout", value: formatMoney(payout), inline: true },
              { name: "Profit", value: formatMoney(profit), inline: true },
            ],
            page: "Fun",
            user: ctx.user,
            guild: ctx.guild ?? undefined,
          }),
        ],
      });
    }

    if (subcommand === "end" || subcommand === "cancel" || subcommand === "stop") {
      if (!existing?.active) {
        return ctx.reply({ embeds: [errorEmbed("You do not have an active mines game to cancel.")] });
      }

      activeGames.delete(ctx.user.id);
      return ctx.reply({ embeds: [infoEmbed("Your active mines game has been cancelled.", "💣 Mines")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand. Use `,mines`, `,mines start <stake> <mines>`, `,mines reveal <tile>`, `,mines cashout`, or `,mines board`.")] });
  },
};