import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function makeDeck() {
  return suits.flatMap(s => ranks.map(r => `${r}${s}`));
}
function draw(deck: string[]) { return deck.splice(Math.floor(Math.random() * deck.length), 1)[0]!; }
function cardValue(card: string) {
  const r = card.slice(0, -1);
  if (r === "A") return 11;
  if (["J", "Q", "K"].includes(r)) return 10;
  return parseInt(r);
}
function handValue(hand: string[]) {
  let val = hand.reduce((a, c) => a + cardValue(c), 0);
  let aces = hand.filter(c => c.startsWith("A")).length;
  while (val > 21 && aces > 0) { val -= 10; aces--; }
  return val;
}

const sessions = new Map<string, { deck: string[]; player: string[]; dealer: string[]; bet: number; guildId: string }>();

export const command: HybridCommand = {
  name: "blackjack",
  description: "Play blackjack.",
  category: "economy",
  guildOnly: true,
  aliases: ["bj"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet", true) ?? parseInt(ctx.args[0]);
    if (!bet || bet <= 0) return ctx.reply({ embeds: [errorEmbed("Bet must be greater than 0.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const deck = makeDeck();
    const player = [draw(deck), draw(deck)];
    const dealer = [draw(deck), draw(deck)];
    const key = ctx.user.id;
    sessions.set(key, { deck, player, dealer, bet, guildId: ctx.guild.id });
    const pv = handValue(player);
    if (pv === 21) {
      const win = Math.floor(bet * 2.5);
      await addBalance(ctx.guild.id, ctx.user.id, win);
      sessions.delete(key);
      return ctx.reply({ embeds: [successEmbed(`Blackjack! 🃏 You win **${win}** coins!\nYour hand: ${player.join(" ")} (${pv})`)] });
    }
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${ctx.user.id}`).setLabel("Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${ctx.user.id}`).setLabel("Stand").setStyle(ButtonStyle.Secondary),
    );
    return ctx.reply({
      embeds: [brandEmbed({
        title: "🃏 Blackjack",
        description: `**Your hand:** ${player.join(" ")} (${pv})\n**Dealer:** ${dealer[0]} 🂠\n\nBet: **${bet}** coins`,
        page: "Blackjack",
      })],
      components: [row as any],
    });
  },
};
