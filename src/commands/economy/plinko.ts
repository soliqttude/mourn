import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const RISKS = {
  low:    [0.5, 0.7, 1, 1.5, 2, 3, 2, 1.5, 1, 0.7, 0.5],
  medium: [0.2, 0.5, 1, 1.5, 2, 3, 5, 3, 2, 1.5, 1, 0.5, 0.2],
  high:   [0.1, 0.2, 0.5, 1, 2, 5, 10, 5, 2, 1, 0.5, 0.2, 0.1],
};

function dropBall(mults: number[]) {
  let pos = Math.floor(mults.length / 2);
  const path: string[] = [];
  for (let i = 0; i < 8; i++) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    pos = Math.max(0, Math.min(mults.length - 1, pos + dir));
    path.push(dir < 0 ? "↙" : "↘");
  }
  return { pos, mult: mults[pos] ?? 1, path };
}

function makeWaitEmbed(bet: number) {
  return new EmbedBuilder()
    .setColor(0x0f1923)
    .setTitle("🎯  P L I N K O")
    .setDescription([
      "```",
      "      ●",
      "     ● ●",
      "    ● ● ●",
      "   ● ● ● ●",
      "  ● ● ● ● ●",
      "",
      "  0.2x 0.5x 1x 1.5x 2x [3x] 2x 1.5x 1x 0.5x 0.2x",
      "```",
      `💰 **Bet:** $${bet.toLocaleString()}\n\nChoose a risk level and drop the ball!`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Plinko` })
    .setTimestamp();
}

function makeResultEmbed(bet: number, pos: number, mult: number, path: string[], risk: string) {
  const mults = RISKS[risk as keyof typeof RISKS] ?? RISKS.medium;
  const slots = mults.map((m, i) => i === pos ? `[${m}x]` : `${m}x`).join("  ");
  const payout = Math.floor(bet * mult);
  const net = payout - bet;
  return new EmbedBuilder()
    .setColor(mult >= 3 ? 0x00e676 : mult >= 1 ? 0xffd740 : 0xff1744)
    .setTitle(`🎯  PLINKO — ${mult}x`)
    .setDescription([
      `**Path:** ${path.join(" ")}`,
      "```",
      slots,
      `Landed: ${mult}x slot`,
      "```",
      "```",
      `  Risk     :  ${risk.toUpperCase()}`,
      `  Bet      :  $${bet.toLocaleString()}`,
      `  Payout   :  $${payout.toLocaleString()}`,
      `  Net      :  ${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString()}`,
      "```",
      mult >= 1 ? `🎉 **Won $${payout.toLocaleString()}!** (+$${net.toLocaleString()})` : `💸 **Lost $${bet.toLocaleString()}.** The ball landed low.`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Plinko` })
    .setTimestamp();
}

export const command: HybridCommand = {
  name: "plinko",
  description: "Drop the ball through the pegs and land on a multiplier!",
  usage: "plinko [bet]",
  examples: ["plinko"],
  category: "economy",
  guildOnly: true,
  aliases: ["plnk"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    const riskRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("plinko_low").setLabel("🟢 Low Risk").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("plinko_medium").setLabel("🟡 Medium Risk").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("plinko_high").setLabel("🔴 High Risk").setStyle(ButtonStyle.Danger),
    );
    const playAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("plinko_again").setLabel("🔄 Drop Again").setStyle(ButtonStyle.Primary),
    );

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeWaitEmbed(bet)],
      components: [riskRow as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30_000,
    });

    const doRound = async (i: any, risk: string) => {
      const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (curBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`You only have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
        return collector.stop();
      }
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);

      await i.update({ embeds: [new EmbedBuilder().setColor(0xffd740).setTitle("🎯  PLINKO").setDescription("```\n  ● dropping...\n```")], components: [] });
      await new Promise(r => setTimeout(r, 1000));

      const mults = RISKS[risk as keyof typeof RISKS] ?? RISKS.medium;
      const { pos, mult, path } = dropBall(mults);
      const payout = Math.floor(bet * mult);
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      await msg.edit({ embeds: [makeResultEmbed(bet, pos, mult, path, risk)], components: [playAgainRow as any] }).catch(() => {});
    };

    collector.on("collect", async i => {
      if (i.customId === "plinko_low") return doRound(i, "low");
      if (i.customId === "plinko_medium") return doRound(i, "medium");
      if (i.customId === "plinko_high") return doRound(i, "high");
      if (i.customId === "plinko_again") {
        const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
        if (curBal.balance < bet) {
          await i.update({ embeds: [errorEmbed(`Insufficient balance. You have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
          return collector.stop();
        }
        await i.update({ embeds: [makeWaitEmbed(bet)], components: [riskRow as any] });
      }
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [] }).catch(() => {});
    });
  },
};
