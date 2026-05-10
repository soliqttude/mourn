import { ApplicationCommandOptionType, ComponentType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

// 4 rows x 5 cols = 20 cells → 4 grid ActionRows + 1 control row = 5 total (Discord's hard limit)
const COLS = 5;
const ROWS = 4;
const TOTAL = COLS * ROWS;

type MinesGame = {
  userId: string;
  guildId: string;
  bet: number;
  mines: number;
  board: boolean[];
  revealed: Set<number>;
  finished: boolean;
};

function createBoard(mineCount: number): boolean[] {
  const board = new Array<boolean>(TOTAL).fill(false);
  let placed = 0;
  while (placed < mineCount) {
    const idx = Math.floor(Math.random() * TOTAL);
    if (!board[idx]) { board[idx] = true; placed++; }
  }
  return board;
}

function getMultiplier(safeRevealed: number, mineCount: number): number {
  let mult = 1;
  for (let i = 0; i < safeRevealed; i++) {
    mult *= (TOTAL - i) / (TOTAL - mineCount - i);
  }
  return Math.max(1, mult * 0.96);
}

function buildComponents(game: MinesGame): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const isRevealed = game.revealed.has(idx);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mines:${game.userId}:${idx}`)
          .setLabel(isRevealed ? "💎" : "▪")
          .setStyle(isRevealed ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(game.finished || isRevealed),
      );
    }
    rows.push(row);
  }
  const payout = Math.floor(game.bet * getMultiplier(game.revealed.size, game.mines));
  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`mines_cashout:${game.userId}`)
        .setLabel(`💎 Cash Out — $${payout.toLocaleString()}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(game.finished || game.revealed.size === 0),
      new ButtonBuilder()
        .setCustomId(`mines_stop:${game.userId}`)
        .setLabel("❌ Give Up")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(game.finished),
    ),
  );
  return rows;
}

function makeEmbed(game: MinesGame, status?: string, revealAll = false): EmbedBuilder {
  const safeRevealed = game.revealed.size;
  const mult = getMultiplier(safeRevealed, game.mines);
  const payout = Math.floor(game.bet * mult);
  const gridLines: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    const cells: string[] = [];
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const isMine = game.board[idx];
      const isRevealed = game.revealed.has(idx);
      if (revealAll) cells.push(isMine ? "💣" : isRevealed ? "💎" : "⬜");
      else cells.push(isRevealed ? "💎" : "🟦");
    }
    gridLines.push(cells.join(" "));
  }
  const won = revealAll && status && !status.includes("BOOM") && !status.includes("Gave up") && !status.includes("Timed");
  const lost = revealAll && status && (status.includes("BOOM") || status.includes("Gave up") || status.includes("Timed"));
  return new EmbedBuilder()
    .setColor(won ? 0x00e676 : lost ? 0xff1744 : 0x0f1923)
    .setTitle("💣  M I N E S")
    .setDescription([
      gridLines.join("\n"),
      "",
      status ?? "Click the tiles below to reveal gems. Cash out before you hit a mine!",
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
  description: "Reveal gems on the board and cash out before hitting a mine!",
  category: "economy",
  guildOnly: true,
  aliases: ["minesweeper", "mine"],
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "mines", description: "Number of mines (1-8, default 3)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    const mineCount = Math.max(1, Math.min(8, ctx.getNumber("mines") ?? parseInt(ctx.args[1] ?? "3") || 3));

    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    if (activeGames.has(ctx.user.id)) return ctx.reply({ embeds: [errorEmbed("You already have an active Mines game! Finish it first.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    await removeBalance(ctx.guild.id, ctx.user.id, bet);

    const game: MinesGame = {
      userId: ctx.user.id,
      guildId: ctx.guild.id,
      bet,
      mines: mineCount,
      board: createBoard(mineCount),
      revealed: new Set(),
      finished: false,
    };
    activeGames.set(ctx.user.id, game);

    if (ctx.source === "slash") await ctx.defer();

    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeEmbed(game)],
      components: buildComponents(game) as any,
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
        const payout = Math.floor(g.bet * getMultiplier(g.revealed.size, g.mines));
        await addBalance(g.guildId, ctx.user.id, payout);
        const net = payout - g.bet;
        await i.update({
          embeds: [makeEmbed(g, `💎 **Cashed out!** Won **$${payout.toLocaleString()}** (+$${net.toLocaleString()}) at ${getMultiplier(g.revealed.size, g.mines).toFixed(2)}x`, true)],
          components: [],
        });
        collector.stop("done");
        return;
      }

      if (i.customId === `mines_stop:${ctx.user.id}`) {
        g.finished = true;
        activeGames.delete(ctx.user.id);
        await i.update({
          embeds: [makeEmbed(g, `❌ **Gave up.** Lost **$${g.bet.toLocaleString()}**.`, true)],
          components: [],
        });
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
            embeds: [makeEmbed(g, `💥 **BOOM! Hit a mine!** Lost **$${g.bet.toLocaleString()}**.`, true)],
            components: [],
          });
          collector.stop("done");
        } else {
          g.revealed.add(idx);
          const safeCells = TOTAL - g.mines;
          if (g.revealed.size >= safeCells) {
            g.finished = true;
            activeGames.delete(ctx.user.id);
            const payout = Math.floor(g.bet * getMultiplier(g.revealed.size, g.mines));
            await addBalance(g.guildId, ctx.user.id, payout);
            await i.update({
              embeds: [makeEmbed(g, `🏆 **PERFECT BOARD!** Won **$${payout.toLocaleString()}**!`, true)],
              components: [],
            });
            collector.stop("done");
          } else {
            await i.update({
              embeds: [makeEmbed(g)],
              components: buildComponents(g) as any,
            });
          }
        }
      }
    });

    collector.on("end", async (_, reason) => {
      const g = activeGames.get(ctx.user.id);
      if (g && !g.finished) {
        g.finished = true;
        activeGames.delete(ctx.user.id);
        await msg.edit({
          embeds: [makeEmbed(g, `⏰ **Timed out.** Lost **$${g.bet.toLocaleString()}**.`, true)],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
