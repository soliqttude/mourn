import { ApplicationCommandOptionType, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

type MinesGame = {
  userId: string;
  guildId: string;
  bet: number;
  mines: number;
  size: number;
  board: boolean[];
  revealed: Set<number>;
  finished: boolean;
};

function createBoard(size: number, mineCount: number): boolean[] {
  const total = size * size;
  const board = new Array<boolean>(total).fill(false);
  let placed = 0;
  while (placed < mineCount) {
    const idx = Math.floor(Math.random() * total);
    if (!board[idx]) { board[idx] = true; placed++; }
  }
  return board;
}

function getMultiplier(safeRevealed: number, mineCount: number, totalCells: number): number {
  let mult = 1;
  for (let i = 0; i < safeRevealed; i++) {
    mult *= (totalCells - i) / (totalCells - mineCount - i);
  }
  return Math.max(1, mult * 0.96);
}

function createGridButtons(game: MinesGame): any[] {
  const rows: any[] = [];
  for (let y = 0; y < game.size; y++) {
    const components: any[] = [];
    for (let x = 0; x < game.size; x++) {
      const idx = y * game.size + x;
      const revealed = game.revealed.has(idx);
      components.push({
        type: 2,
        custom_id: `mines:${game.userId}:${idx}`,
        label: revealed ? "💎" : " ",
        style: revealed ? 3 : 2,
        disabled: game.finished || revealed,
      });
    }
    rows.push({ type: 1, components });
  }
  const total = game.size * game.size;
  const payout = Math.floor(game.bet * getMultiplier(game.revealed.size, game.mines, total));
  rows.push({
    type: 1,
    components: [
      {
        type: 2,
        custom_id: `mines_cashout:${game.userId}`,
        label: `💎 Cash Out — $${payout.toLocaleString()}`,
        style: 1,
        disabled: game.finished || game.revealed.size === 0,
      },
      {
        type: 2,
        custom_id: `mines_stop:${game.userId}`,
        label: "❌ Give Up",
        style: 4,
        disabled: game.finished,
      },
    ],
  });
  return rows;
}

function makeEmbed(game: MinesGame, status?: string, revealAll = false): EmbedBuilder {
  const total = game.size * game.size;
  const safeRevealed = game.revealed.size;
  const mult = getMultiplier(safeRevealed, game.mines, total);
  const payout = Math.floor(game.bet * mult);

  const rows: string[] = [];
  for (let y = 0; y < game.size; y++) {
    const row: string[] = [];
    for (let x = 0; x < game.size; x++) {
      const idx = y * game.size + x;
      const isMine = game.board[idx];
      const isRevealed = game.revealed.has(idx);
      if (revealAll) row.push(isMine ? "💣" : isRevealed ? "💎" : "⬜");
      else row.push(isRevealed ? "💎" : "🟦");
    }
    rows.push(row.join(" "));
  }

  return new EmbedBuilder()
    .setColor(revealAll && status?.includes("BOOM") ? 0xff1744 : revealAll && !status?.includes("ended") ? 0x00e676 : 0x0f1923)
    .setTitle("💣  M I N E S")
    .setDescription([
      rows.join("\n"),
      "",
      status ?? "Click tiles to reveal gems. Cash out before you hit a mine!",
      "",
      "```",
      `  Bet         :  $${game.bet.toLocaleString()}`,
      `  Mines       :  ${game.mines}`,
      `  Gems Found  :  ${safeRevealed}`,
      `  Multiplier  :  ${mult.toFixed(2)}x`,
      `  Cash Out    :  $${payout.toLocaleString()}`,
      "```",
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Mines` })
    .setTimestamp();
}

const activeGames = new Map<string, MinesGame>();

export const command: HybridCommand = {
  name: "mines",
  description: "Interactive mines game — reveal gems and cash out before hitting a bomb!",
  category: "economy",
  guildOnly: true,
  aliases: ["minesweeper", "mine"],
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "mines", description: "Number of mines (1-10, default 3)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    const mineCount = ctx.getNumber("mines") ?? parseInt(ctx.args[1] ?? "3") || 3;

    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    if (mineCount < 1 || mineCount > 10) return ctx.reply({ embeds: [errorEmbed("Mines must be between 1 and 10.")] });
    if (activeGames.has(ctx.user.id)) return ctx.reply({ embeds: [errorEmbed("You already have an active Mines game! Finish it first.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    await removeBalance(ctx.guild.id, ctx.user.id, bet);

    const game: MinesGame = {
      userId: ctx.user.id,
      guildId: ctx.guild.id,
      bet,
      mines: mineCount,
      size: 5,
      board: createBoard(5, mineCount),
      revealed: new Set(),
      finished: false,
    };
    activeGames.set(ctx.user.id, game);

    if (ctx.source === "slash") await ctx.defer();

    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeEmbed(game)],
      components: createGridButtons(game),
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i: any) => i.user.id === ctx.user.id,
      time: 300_000,
    });

    collector.on("collect", async (i: any) => {
      const g = activeGames.get(ctx.user.id);
      if (!g || g.finished) return i.deferUpdate().catch(() => {});

      if (i.customId === `mines_cashout:${ctx.user.id}`) {
        g.finished = true;
        activeGames.delete(ctx.user.id);
        const payout = Math.floor(g.bet * getMultiplier(g.revealed.size, g.mines, 25));
        await addBalance(g.guildId, ctx.user.id, payout);
        const net = payout - g.bet;
        await i.update({
          embeds: [makeEmbed(g, `💎 **Cashed out!** Won **$${payout.toLocaleString()}** (+$${net.toLocaleString()}) at ${getMultiplier(g.revealed.size, g.mines, 25).toFixed(2)}x`, true)],
          components: [],
        });
        collector.stop("done");
        return;
      }

      if (i.customId === `mines_stop:${ctx.user.id}`) {
        g.finished = true;
        activeGames.delete(ctx.user.id);
        await i.update({ embeds: [makeEmbed(g, `❌ **Gave up.** Lost **$${g.bet.toLocaleString()}**.`, true)], components: [] });
        collector.stop("done");
        return;
      }

      if (i.customId.startsWith(`mines:${ctx.user.id}:`)) {
        const idx = parseInt(i.customId.split(":")[2]!);
        if (g.board[idx]) {
          g.finished = true;
          g.revealed.add(idx);
          activeGames.delete(ctx.user.id);
          await i.update({
            embeds: [makeEmbed(g, `💥 **BOOM! You hit a mine!** Lost **$${g.bet.toLocaleString()}**.`, true)],
            components: [],
          });
          collector.stop("done");
        } else {
          g.revealed.add(idx);
          const safeCells = 25 - g.mines;
          if (g.revealed.size >= safeCells) {
            g.finished = true;
            activeGames.delete(ctx.user.id);
            const payout = Math.floor(g.bet * getMultiplier(g.revealed.size, g.mines, 25));
            await addBalance(g.guildId, ctx.user.id, payout);
            await i.update({
              embeds: [makeEmbed(g, `🏆 **PERFECT BOARD!** Won **$${payout.toLocaleString()}**!`, true)],
              components: [],
            });
            collector.stop("done");
          } else {
            await i.update({ embeds: [makeEmbed(g)], components: createGridButtons(g) });
          }
        }
      }
    });

    collector.on("end", async (_, reason) => {
      const g = activeGames.get(ctx.user.id);
      if (g && !g.finished) {
        g.finished = true;
        activeGames.delete(ctx.user.id);
        await msg.edit({ embeds: [makeEmbed(g, `⏰ **Timed out.** Lost **$${g.bet.toLocaleString()}**.`, true)], components: [] }).catch(() => {});
      }
    });
  },
};
