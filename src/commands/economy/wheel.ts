import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const SLOTS = [
  { label: "0.2x 💀", mult: 0.2, color: 0xff1744 },
  { label: "0.5x 🔴", mult: 0.5, color: 0xff5252 },
  { label: "1.5x 🟡", mult: 1.5, color: 0xffd740 },
  { label: "2x 🟢",   mult: 2,   color: 0x00e676 },
  { label: "0.2x 💀", mult: 0.2, color: 0xff1744 },
  { label: "3x 💎",   mult: 3,   color: 0x00b0ff },
  { label: "1x 🔵",   mult: 1,   color: 0x448aff },
  { label: "0.5x 🔴", mult: 0.5, color: 0xff5252 },
  { label: "5x 👑",   mult: 5,   color: 0xaa00ff },
  { label: "0.2x 💀", mult: 0.2, color: 0xff1744 },
  { label: "10x 🌟",  mult: 10,  color: 0xffea00 },
  { label: "0.5x 🔴", mult: 0.5, color: 0xff5252 },
];

function makeWaitEmbed(bet: number) {
  const preview = SLOTS.map((s, i) => i === 5 ? `  ❯ [${s.label}] ◀` : `    ${s.label}`).join("\n");
  return new EmbedBuilder()
    .setColor(0x0f1923)
    .setTitle("🎡  W H E E L  O F  F O R T U N E")
    .setDescription(["```", preview, "```", `\n💰 **Bet:** $${bet.toLocaleString()}\n\nHit **Spin** to launch the wheel!`].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Wheel` })
    .setTimestamp();
}

function makeSpinEmbed(frame: number) {
  const shifted = [...SLOTS.slice(frame % SLOTS.length), ...SLOTS.slice(0, frame % SLOTS.length)];
  const display = shifted.map((s, i) => i === 5 ? `  ❯ [${s.label}] ◀` : `    ${s.label}`).join("\n");
  return new EmbedBuilder()
    .setColor(0xffd740)
    .setTitle("🎡  SPINNING...")
    .setDescription(["```", display, "```"].join("\n"))
    .setTimestamp();
}

function makeResultEmbed(bet: number, idx: number) {
  const slot = SLOTS[idx]!;
  const payout = Math.floor(bet * slot.mult);
  const net = payout - bet;
  const display = SLOTS.map((s, i) => i === idx ? `  ❯ [${s.label}] ◀` : `    ${s.label}`).join("\n");
  return new EmbedBuilder()
    .setColor(slot.color)
    .setTitle(slot.mult >= 1 ? "🎡  WHEEL — WIN!" : "🎡  WHEEL — LOSS")
    .setDescription([
      "```",
      display,
      "```",
      "```",
      `  Multiplier  :  ${slot.mult}x`,
      `  Bet         :  $${bet.toLocaleString()}`,
      `  Payout      :  $${payout.toLocaleString()}`,
      `  Net         :  ${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString()}`,
      "```",
      slot.mult >= 1
        ? `🎉 **Landed on ${slot.mult}x!** Won **$${payout.toLocaleString()}** (+$${net.toLocaleString()}).`
        : `💸 **Landed on ${slot.mult}x.** Lost **$${bet.toLocaleString()}**.`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Wheel` })
    .setTimestamp();
}

export const command: HybridCommand = {
  name: "wheel",
  description: "Spin the fortune wheel for a random multiplier!",
  category: "economy",
  guildOnly: true,
  aliases: ["spinwheel", "fortunewheel", "fw"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    const spinRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("wheel_spin").setLabel("🎡 Spin the Wheel!").setStyle(ButtonStyle.Success),
    );
    const playAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("wheel_again").setLabel("🔄 Spin Again").setStyle(ButtonStyle.Primary),
    );

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeWaitEmbed(bet)],
      components: [spinRow as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30_000,
    });

    const doSpin = async (i: any) => {
      const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (curBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`You only have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
        return collector.stop();
      }
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      const finalIdx = Math.floor(Math.random() * SLOTS.length);
      await i.update({ embeds: [makeSpinEmbed(0)], components: [] });
      for (let f = 1; f <= 8; f++) {
        await new Promise(r => setTimeout(r, 150));
        await msg.edit({ embeds: [makeSpinEmbed(f)] }).catch(() => {});
      }
      const payout = Math.floor(bet * SLOTS[finalIdx]!.mult);
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      await msg.edit({ embeds: [makeResultEmbed(bet, finalIdx)], components: [playAgainRow as any] }).catch(() => {});
    };

    collector.on("collect", async i => {
      if (i.customId === "wheel_spin") return doSpin(i);
      if (i.customId === "wheel_again") return doSpin(i);
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [] }).catch(() => {});
    });
  },
};
