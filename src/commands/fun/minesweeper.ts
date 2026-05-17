import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const MINE = "💣";
const ZERO = "0️⃣";
const NUMS = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];

export const command: HybridCommand = {
  name: "minesweeper",
  description: "Generate a minesweeper board to share. Uses Discord spoiler tiles.",
  usage: "minesweeper [size]",
  examples: ["minesweeper"],
  category: "fun",
  options: [
    { name: "size", description: "Board size: small (5x5), medium (8x8), large (10x10)", type: ApplicationCommandOptionType.String, required: false,
      choices: [{ name: "small (5×5)", value: "small" }, { name: "medium (8×8)", value: "medium" }, { name: "large (10×10)", value: "large" }] },
  ],
  async execute(ctx) {
    const size = ctx.getString("size") ?? "medium";
    const [cols, rows, mines] = size === "small" ? [5, 5, 4] : size === "large" ? [10, 10, 20] : [8, 8, 10];

    const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

    let placed = 0;
    while (placed < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (grid[r]![c] !== -1) { grid[r]![c] = -1; placed++; }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r]![c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (grid[r + dr]?.[c + dc] === -1) count++;
          }
        }
        grid[r]![c] = count;
      }
    }

    const board = grid.map(row =>
      row.map(cell => {
        const emoji = cell === -1 ? MINE : (NUMS[cell] ?? ZERO);
        return cell === 0 ? emoji : `||${emoji}||`;
      }).join("")
    ).join("\n");

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle(`💣 minesweeper — ${size}`)
          .setDescription(`${rows}×${cols} board, ${mines} mines. click to reveal!\n\n${board}`)
          .setFooter({ text: `${config.embedFooter} • fun` })
          .setTimestamp(),
      ],
    });
  },
};
