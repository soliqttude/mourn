import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function rollTwo() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { d1, d2, total: d1 + d2 };
}

function makeWaitEmbed(bet: number) {
  return new EmbedBuilder()
    .setColor(0x0f1923)
    .setTitle("🎲 DICE DUEL")
    .setDescription([
      "```",
      "  You vs The House",
      "  ─────────────────",
      "  Roll higher to win 2x your bet.",
      "  Tie = refund. Lower = loss.",
      "```",
      `💰 **Bet:** ${bet} coins\n\nReady to roll?`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Dice` })
    .setTimestamp();
}

function makeRollingEmbed() {
  return new EmbedBuilder()
    .setColor(0xffd740)
    .setTitle("🎲 ROLLING...")
    .setDescription("```\n  ⚄ ⚂  vs  ⚁ ⚅\n  Rolling dice...\n```")
    .setFooter({ text: `${config.embedFooter} • Dice` })
    .setTimestamp();
}

function makeResultEmbed(bet: number, p1: number, p2: number, h1: number, h2: number) {
  const pt = p1 + p2, ht = h1 + h2;
  const result: "win" | "tie" | "lose" = pt > ht ? "win" : pt === ht ? "tie" : "lose";
  const payout = result === "win" ? bet * 2 : result === "tie" ? bet : 0;
  const net = payout - bet;
  return new EmbedBuilder()
    .setColor(result === "win" ? 0x00e676 : result === "tie" ? 0xffd740 : 0xff1744)
    .setTitle(`🎲 DICE — ${result === "win" ? "YOU WIN!" : result === "tie" ? "TIE" : "HOUSE WINS"}`)
    .setDescription([
      "```",
      `  You    :  ${FACES[p1]} ${FACES[p2]}  →  ${pt}`,
      `  House  :  ${FACES[h1]} ${FACES[h2]}  →  ${ht}`,
      "```",
      result === "win" ? `🎉 Won **+${net}** coins!` :
      result === "tie" ? "🤝 Tie — bet refunded." :
      `💸 Lost **${bet}** coins.`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Dice` })
    .setTimestamp();
}

export const command: HybridCommand = {
  name: "dicegame",
  description: "Roll 2 dice vs the house. Higher total wins 2x. Tie = refund.",
  category: "economy",
  guildOnly: true,
  aliases: ["dicebet", "diceroll", "dice"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });

    const rollRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("dice_roll").setLabel("🎲 Roll Dice").setStyle(ButtonStyle.Primary)
    );
    const playAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("dice_again").setLabel("🔄 Roll Again").setStyle(ButtonStyle.Primary)
    );

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeWaitEmbed(bet)],
      components: [rollRow as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30000,
    });

    const doRoll = async (i: any) => {
      const currentBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (currentBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`You only have **${currentBal.balance}** coins.`)], components: [] });
        return collector.stop();
      }

      await i.update({ embeds: [makeRollingEmbed()], components: [] });
      await new Promise(r => setTimeout(r, 1000));

      const p = rollTwo(), h = rollTwo();
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      const pt = p.d1 + p.d2, ht = h.d1 + h.d2;
      const result = pt > ht ? "win" : pt === ht ? "tie" : "lose";
      if (result === "win") await addBalance(ctx.guild!.id, ctx.user.id, bet * 2);
      else if (result === "tie") await addBalance(ctx.guild!.id, ctx.user.id, bet);

      await msg.edit({ embeds: [makeResultEmbed(bet, p.d1, p.d2, h.d1, h.d2)], components: [playAgainRow as any] }).catch(() => {});
    };

    collector.on("collect", async i => {
      if (i.customId === "dice_roll" || i.customId === "dice_again") {
        if (i.customId === "dice_again") {
          await i.update({ embeds: [makeWaitEmbed(bet)], components: [rollRow as any] });
        } else {
          await doRoll(i);
        }
      }
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ embeds: [makeWaitEmbed(bet)], components: [] }).catch(() => {});
    });
  },
};
