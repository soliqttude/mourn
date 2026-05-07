import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const MULTS = [0.2, 0.5, 1, 1.5, 2, 3, 5, 3, 2, 1.5, 1, 0.5, 0.2];
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
  const slots = MULTS.map(m => `${m}x`).join("  ");
  return new EmbedBuilder()
    .setColor(0x0f1923)
    .setTitle("🎯 PLINKO")
    .setDescription([
      "```",
      "        ●",
      "       ● ●",
      "      ● ● ●",
      "     ● ● ● ●",
      "    ● ● ● ● ●",
      slots,
      "```",
      `💰 **Bet:** ${bet} coins\n\nChoose risk and drop the ball!`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Plinko` })
    .setTimestamp();
}

function makeResultEmbed(bet: number, pos: number, mult: number, path: string[], risk: string) {
  const mults = RISKS[risk as keyof typeof RISKS] ?? MULTS;
  const slots = mults.map((m, i) => i === pos ? `[${m}x]` : `${m}x`).join("  ");
  const net = Math.floor(bet * mult) - bet;
  return new EmbedBuilder()
    .setColor(mult >= 1 ? (mult >= 3 ? 0x00e676 : 0xffd740) : 0xff1744)
    .setTitle(`🎯 PLINKO — ${mult}x`)
    .setDescription([
      `**Path:** ${path.join(" ")}`,
      "```",
      slots,
      `Landed: slot ${pos} → ${mult}x`,
      "```",
      `Net: **${net >= 0 ? "+" : ""}${net}** coins`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Plinko` })
    .setTimestamp();
}

export const command: HybridCommand = {
  name: "plinko",
  description: "Drop the ball through the pegs and land on a multiplier!",
  category: "economy",
  guildOnly: true,
  aliases: ["plnk"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });

    const riskRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("plinko_low").setLabel("🟢 Low Risk").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("plinko_medium").setLabel("🟡 Medium Risk").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("plinko_high").setLabel("🔴 High Risk").setStyle(ButtonStyle.Danger),
    );
    const playAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("plinko_again").setLabel("🔄 Drop Again").setStyle(ButtonStyle.Primary)
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
      time: 30000,
    });

    const doRound = async (i: any, risk: string) => {
      const currentBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (currentBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`You only have **${currentBal.balance}** coins.`)], components: [] });
        return collector.stop();
      }
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      const mults = RISKS[risk as keyof typeof RISKS] ?? MULTS;
      const { pos, mult, path } = dropBall(mults);
      const payout = Math.floor(bet * mult);
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      await i.update({ embeds: [makeResultEmbed(bet, pos, mult, path, risk)], components: [playAgainRow as any] });
    };

    collector.on("collect", async i => {
      if (i.customId === "plinko_low") return doRound(i, "low");
      if (i.customId === "plinko_medium") return doRound(i, "medium");
      if (i.customId === "plinko_high") return doRound(i, "high");
      if (i.customId === "plinko_again") {
        await i.update({ embeds: [makeWaitEmbed(bet)], components: [riskRow as any] });
      }
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ embeds: [makeWaitEmbed(bet)], components: [] }).catch(() => {});
    });
  },
};
