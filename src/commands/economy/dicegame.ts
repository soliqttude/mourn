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
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    const rollRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("dice_roll").setLabel("🎲 Roll Dice").setStyle(ButtonStyle.Primary),
    );
    const playAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("dice_again").setLabel("🔄 Roll Again").setStyle(ButtonStyle.Primary),
    );

    const waitEmbed = new EmbedBuilder()
      .setColor(0x0f1923)
      .setTitle("🎲  D I C E  D U E L")
      .setDescription([
        "```",
        "  You vs The House — roll higher to win 2x.",
        "  Tie = refund. Lower = loss.",
        "```",
        `💰 **Bet:** $${bet.toLocaleString()}\n\nHit **Roll** when ready!`,
      ].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Dice` })
      .setTimestamp();

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [waitEmbed],
      components: [rollRow as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30_000,
    });

    const doRoll = async (i: any) => {
      const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (curBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`You only have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
        return collector.stop();
      }
      await i.update({ embeds: [new EmbedBuilder().setColor(0xffd740).setTitle("🎲  ROLLING...").setDescription("```\n  ⚄ ⚂  vs  ⚁ ⚅  — rolling...\n```")], components: [] });
      await new Promise(r => setTimeout(r, 1000));

      const p = rollTwo(), h = rollTwo();
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      const result = p.total > h.total ? "win" : p.total === h.total ? "tie" : "lose";
      const payout = result === "win" ? bet * 2 : result === "tie" ? bet : 0;
      const net = payout - bet;
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);

      const resultEmbed = new EmbedBuilder()
        .setColor(result === "win" ? 0x00e676 : result === "tie" ? 0xffd740 : 0xff1744)
        .setTitle(result === "win" ? "🎲  DICE — YOU WIN!" : result === "tie" ? "🎲  DICE — TIE" : "🎲  DICE — HOUSE WINS")
        .setDescription([
          "```",
          `  You    :  ${FACES[p.d1]} ${FACES[p.d2]}  →  ${p.total}`,
          `  House  :  ${FACES[h.d1]} ${FACES[h.d2]}  →  ${h.total}`,
          "",
          `  Bet     :  $${bet.toLocaleString()}`,
          `  Payout  :  $${payout.toLocaleString()}`,
          `  Net     :  ${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString()}`,
          "```",
          result === "win" ? `🏆 **Your ${p.total} beats the house's ${h.total}!** +$${net.toLocaleString()}` :
          result === "tie" ? "🤝 **Same roll — bet returned.**" :
          `💸 **House rolled higher. Lost $${bet.toLocaleString()}.**`,
        ].join("\n"))
        .setFooter({ text: `${config.embedFooter} • Dice` })
        .setTimestamp();
      await msg.edit({ embeds: [resultEmbed], components: [playAgainRow as any] }).catch(() => {});
    };

    collector.on("collect", async i => {
      if (i.customId === "dice_roll") return doRoll(i);
      if (i.customId === "dice_again") {
        const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
        if (curBal.balance < bet) {
          await i.update({ embeds: [errorEmbed(`Insufficient balance. You have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
          return collector.stop();
        }
        await i.update({ embeds: [waitEmbed], components: [rollRow as any] });
        await doRoll({ update: async () => {}, user: { id: ctx.user.id } } as any);
      }
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [] }).catch(() => {});
    });
  },
};
