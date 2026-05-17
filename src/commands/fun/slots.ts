import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const SYMBOLS = [
  { emoji: "💎", weight: 0.03, mult: 15 },
  { emoji: "7️⃣", weight: 0.07, mult: 7 },
  { emoji: "🍇", weight: 0.10, mult: 4 },
  { emoji: "🍊", weight: 0.15, mult: 3 },
  { emoji: "🍋", weight: 0.20, mult: 2 },
  { emoji: "🍒", weight: 0.25, mult: 1.5 },
  { emoji: "💀", weight: 0.20, mult: 0 },
];

function pickSymbol(): { emoji: string; mult: number } {
  let r = Math.random(), cumul = 0;
  for (const s of SYMBOLS) {
    cumul += s.weight;
    if (r < cumul) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1]!;
}

function makeResultEmbed(reels: { emoji: string; mult: number }[], bet: number): { embed: EmbedBuilder; payout: number } {
  const allMatch = reels[0]!.emoji === reels[1]!.emoji && reels[1]!.emoji === reels[2]!.emoji;
  const twoMatch = !allMatch && (reels[0]!.emoji === reels[1]!.emoji || reels[1]!.emoji === reels[2]!.emoji || reels[0]!.emoji === reels[2]!.emoji);

  let mult = 0;
  let resultLine = "";
  if (allMatch) {
    mult = reels[0]!.mult;
    resultLine = mult === 0
      ? "💀 **Triple skull!** You lost everything."
      : `🎰 **THREE OF A KIND — ${mult}x!**`;
  } else if (twoMatch) {
    mult = 0.5;
    resultLine = "✨ **Two of a kind — 0.5x** partial payout.";
  } else {
    resultLine = "💸 **No match.** Better luck next time.";
  }

  const payout = Math.floor(bet * mult);
  const net = payout - bet;
  const netStr = net >= 0 ? `+$${net.toLocaleString()}` : `-$${Math.abs(net).toLocaleString()}`;

  const color = payout > bet ? 0x00e676 : payout > 0 ? 0xffd740 : 0xff1744;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("🎰  S L O T S")
    .setDescription([
      "```",
      `  ┌─────┬─────┬─────┐`,
      `  │  ${reels[0]!.emoji}  │  ${reels[1]!.emoji}  │  ${reels[2]!.emoji}  │`,
      `  └─────┴─────┴─────┘`,
      "```",
      resultLine,
      "",
      "```",
      `  Bet     :  $${bet.toLocaleString()}`,
      `  Payout  :  $${payout.toLocaleString()}  (${netStr})`,
      "```",
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Slots` })
    .setTimestamp();
  return { embed, payout };
}

function makeSpinningEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xffd740)
    .setTitle("🎰  S L O T S")
    .setDescription([
      "```",
      `  ┌─────┬─────┬─────┐`,
      `  │  🔄  │  🔄  │  🔄  │`,
      `  └─────┴─────┴─────┘`,
      "```",
      "*Spinning...*",
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Slots` })
    .setTimestamp();
}

function spinRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("slots_spin").setLabel("🎰 Spin").setStyle(ButtonStyle.Success).setDisabled(disabled),
  );
}

export const command: HybridCommand = {
  name: "slots",
  description: "Spin the slot machine and win up to 15x your bet!",
  usage: "slots [bet]",
  examples: ["slots"],
  category: "economy",
  guildOnly: true,
  aliases: ["slot", "spin"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    if (ctx.source === "slash") await ctx.defer();

    const doSpin = async (currentBet: number) => {
      const reels = [pickSymbol(), pickSymbol(), pickSymbol()];
      return makeResultEmbed(reels, currentBet);
    };

    const startEmbed = new EmbedBuilder()
      .setColor(0x0f1923)
      .setTitle("🎰  S L O T S")
      .setDescription([
        "```",
        `  ┌─────┬─────┬─────┐`,
        `  │  ?  │  ?  │  ?  │`,
        `  └─────┴─────┴─────┘`,
        "```",
        `💰 **Bet:** $${bet.toLocaleString()}\n\nHit **Spin** to roll the reels!`,
        "",
        "💎 = 15x  |  7️⃣ = 7x  |  🍇 = 4x  |  🍊 = 3x  |  🍋 = 2x  |  🍒 = 1.5x",
      ].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Slots` })
      .setTimestamp();

    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [startEmbed],
      components: [spinRow() as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 60_000,
    });

    collector.on("collect", async i => {
      const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (curBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`Insufficient balance. You have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
        return collector.stop();
      }
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      await i.update({ embeds: [makeSpinningEmbed()], components: [] });
      await new Promise(r => setTimeout(r, 1200));
      const { embed, payout } = await doSpin(bet);
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      const playAgain = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("slots_spin").setLabel("🔄 Spin Again").setStyle(ButtonStyle.Primary),
      );
      await msg.edit({ embeds: [embed], components: [playAgain as any] }).catch(() => {});
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [] }).catch(() => {});
    });
  },
};
