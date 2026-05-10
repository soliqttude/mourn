import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function makeDeck(): string[] {
  return SUITS.flatMap(s => RANKS.map(r => `${r}${s}`));
}
function drawCard(deck: string[]): string {
  return deck.splice(Math.floor(Math.random() * deck.length), 1)[0]!;
}
function cardValue(card: string): number {
  const r = card.slice(0, -1);
  if (r === "A") return 11;
  if (["J", "Q", "K"].includes(r)) return 10;
  return parseInt(r);
}
function handValue(hand: string[]): number {
  let val = hand.reduce((a, c) => a + cardValue(c), 0);
  let aces = hand.filter(c => c.startsWith("A")).length;
  while (val > 21 && aces > 0) { val -= 10; aces--; }
  return val;
}

type BJState = "playing" | "bust" | "win" | "push" | "blackjack" | "dealer_bust";

function makeEmbed(
  state: BJState,
  playerHand: string[],
  dealerHand: string[],
  bet: number,
  payout = 0,
  hideDealer = true,
): EmbedBuilder {
  const pv = handValue(playerHand);
  const dv = handValue(dealerHand);
  const colors: Record<BJState, number> = {
    playing: 0x0f1923, bust: 0xff1744, win: 0x00e676,
    push: 0xffd740, blackjack: 0x00e676, dealer_bust: 0x00e676,
  };
  const titles: Record<BJState, string> = {
    playing: "🃏  B L A C K J A C K",
    bust: "🃏  BUST — BET LOST",
    win: "🃏  YOU WIN!",
    push: "🃏  PUSH — TIE",
    blackjack: "🃏  BLACKJACK!  🎰",
    dealer_bust: "🃏  DEALER BUSTS — YOU WIN!",
  };
  const dealerDisplay = hideDealer
    ? `${dealerHand[0]} 🂠  (?)`
    : `${dealerHand.join(" ")}  **(${dv})**`;
  const net = payout - bet;
  const netStr = net >= 0 ? `+$${net.toLocaleString()}` : `-$${Math.abs(net).toLocaleString()}`;
  const lines = [
    "```",
    `  Your Hand  :  ${playerHand.join(" ")}  (${pv})`,
    `  Dealer     :  ${dealerDisplay}`,
    "```",
    `💰 **Bet:** $${bet.toLocaleString()}`,
  ];
  if (state !== "playing") {
    lines.push(`💵 **Payout:** $${payout.toLocaleString()}  *(${netStr})*`);
    const msgs: Record<BJState, string> = {
      bust: "💥 Over 21 — better luck next time.",
      win: `🏆 Your **${pv}** beats the dealer's **${dv}**.`,
      push: "🤝 Same value — your bet is returned.",
      blackjack: "🎰 Paid at **3:2**. Nice hand.",
      dealer_bust: `💥 Dealer went over 21. You win!`,
      playing: "",
    };
    lines.push("", msgs[state]);
  } else {
    lines.push("", "*What's your move?*");
  }
  return new EmbedBuilder()
    .setColor(colors[state])
    .setTitle(titles[state])
    .setDescription(lines.join("\n"))
    .setFooter({ text: `${config.embedFooter} • Blackjack` })
    .setTimestamp();
}

function makeRow(disabled = false, canDouble = false): ActionRowBuilder<ButtonBuilder> {
  const btns = [
    new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  ];
  if (canDouble) {
    btns.push(
      new ButtonBuilder().setCustomId("bj_double").setLabel("Double Down").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    );
  }
  return new ActionRowBuilder<ButtonBuilder>().addComponents(btns);
}

export const command: HybridCommand = {
  name: "blackjack",
  description: "Play Blackjack — beat the dealer without going over 21.",
  category: "economy",
  guildOnly: true,
  aliases: ["bj"],
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const deck = makeDeck();
    const player = [drawCard(deck), drawCard(deck)];
    const dealer = [drawCard(deck), drawCard(deck)];
    const pv = handValue(player);

    // Natural blackjack — instant payout
    if (pv === 21) {
      const payout = Math.floor(bet * 2.5);
      await addBalance(ctx.guild.id, ctx.user.id, payout);
      if (ctx.source === "slash") await ctx.defer();
      await ctx.channel.send({
        content: `<@${ctx.user.id}>`,
        embeds: [makeEmbed("blackjack", player, dealer, bet, payout, false)],
      });
      return;
    }

    if (ctx.source === "slash") await ctx.defer();
    let currentBet = bet;

    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeEmbed("playing", player, dealer, currentBet)],
      components: [makeRow(false, bal.balance >= bet) as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 120_000,
    });

    const finish = async (i: any, state: BJState, finalBet: number) => {
      const payout =
        state === "bust" ? 0 :
        state === "push" ? finalBet :
        state === "blackjack" ? Math.floor(finalBet * 2.5) :
        finalBet * 2;
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      collector.stop("done");
      await i.update({ embeds: [makeEmbed(state, player, dealer, finalBet, payout, false)], components: [] });
    };

    collector.on("collect", async i => {
      if (i.customId === "bj_hit") {
        player.push(drawCard(deck));
        const pv2 = handValue(player);
        if (pv2 > 21) return finish(i, "bust", currentBet);
        if (pv2 === 21) {
          // Auto-stand on 21
          while (handValue(dealer) < 17) dealer.push(drawCard(deck));
          const dv2 = handValue(dealer);
          const state: BJState = dv2 > 21 ? "dealer_bust" : pv2 > dv2 ? "win" : pv2 === dv2 ? "push" : "bust";
          return finish(i, state, currentBet);
        }
        await i.update({ embeds: [makeEmbed("playing", player, dealer, currentBet)], components: [makeRow(false) as any] });

      } else if (i.customId === "bj_double") {
        const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
        if (curBal.balance < currentBet) {
          await i.reply({ content: "❌ Insufficient balance to double down!", flags: 64 });
          return;
        }
        await removeBalance(ctx.guild!.id, ctx.user.id, currentBet);
        currentBet *= 2;
        player.push(drawCard(deck));
        while (handValue(dealer) < 17) dealer.push(drawCard(deck));
        const pv3 = handValue(player), dv3 = handValue(dealer);
        const state: BJState = pv3 > 21 ? "bust" : dv3 > 21 ? "dealer_bust" : pv3 > dv3 ? "win" : pv3 === dv3 ? "push" : "bust";
        return finish(i, state, currentBet);

      } else if (i.customId === "bj_stand") {
        while (handValue(dealer) < 17) dealer.push(drawCard(deck));
        const pv4 = handValue(player), dv4 = handValue(dealer);
        const state: BJState = dv4 > 21 ? "dealer_bust" : pv4 > dv4 ? "win" : pv4 === dv4 ? "push" : "bust";
        return finish(i, state, currentBet);
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "done") {
        await msg.edit({ embeds: [makeEmbed("bust", player, dealer, currentBet, 0, false)], components: [] }).catch(() => {});
      }
    });
  },
};
