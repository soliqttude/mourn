import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const PAYOUT = [0, 0, 1, 2, 4, 8, 15, 30, 60, 100, 200];

function makeWaitEmbed(bet: number, picks: number[]) {
  const grid = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1;
    return picks.includes(n) ? `[${n}]` : `${n}`;
  });
  const rows = Array.from({ length: 5 }, (_, r) => grid.slice(r * 8, r * 8 + 8).join("  "));
  return new EmbedBuilder()
    .setColor(0x0f1923)
    .setTitle("🎱  K E N O")
    .setDescription([
      `**Your picks (${picks.length}/10):** ${picks.join(", ") || "none"}`,
      "```",
      ...rows,
      "```",
      `💰 **Bet:** $${bet.toLocaleString()}\n\nHit **Draw** when you're ready!`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Keno` })
    .setTimestamp();
}

function makeResultEmbed(bet: number, picks: number[], drawn: Set<number>) {
  const hits = picks.filter(p => drawn.has(p));
  const mult = PAYOUT[hits.length] ?? 0;
  const payout = Math.floor(bet * mult);
  const net = payout - bet;

  const grid = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1;
    if (picks.includes(n) && drawn.has(n)) return "✅";
    if (picks.includes(n)) return "❌";
    if (drawn.has(n)) return "🔵";
    return "⬜";
  });
  const rows = Array.from({ length: 5 }, (_, r) => grid.slice(r * 8, r * 8 + 8).join(""));

  return new EmbedBuilder()
    .setColor(hits.length >= 4 ? 0x00e676 : hits.length >= 2 ? 0xffd740 : 0xff1744)
    .setTitle(`🎱  KENO — ${hits.length}/${picks.length} Hits`)
    .setDescription([
      rows.join("\n"),
      "✅ Hit  ❌ Missed  🔵 Drawn  ⬜ Not drawn",
      "```",
      `  Picks    :  ${picks.join(", ")}`,
      `  Hits     :  ${hits.length}/${picks.length}`,
      `  Payout   :  ${mult}x`,
      `  Bet      :  $${bet.toLocaleString()}`,
      `  Won      :  $${payout.toLocaleString()}`,
      `  Net      :  ${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString()}`,
      "```",
      hits.length >= 4
        ? `🎉 **Nice hits! Won $${payout.toLocaleString()}** (+$${net.toLocaleString()}).`
        : hits.length >= 2
        ? `✨ **Partial match! Won $${payout.toLocaleString()}**.`
        : `💸 **Not enough hits. Lost $${bet.toLocaleString()}.**`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Keno` })
    .setTimestamp();
}

export const command: HybridCommand = {
  name: "keno",
  description: "Pick 1-10 numbers (1-40). Match the drawn numbers to win!",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "numbers", description: "Your picks space-separated: 5 12 23 7", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    const raw = ctx.getString("numbers") ?? ctx.args.slice(1).join(" ");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const picks = [...new Set(raw.split(/\s+/).map(Number).filter(n => n >= 1 && n <= 40))];
    if (picks.length < 1 || picks.length > 10)
      return ctx.reply({ embeds: [errorEmbed("Pick 1–10 unique numbers between 1 and 40.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    const drawRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("keno_draw").setLabel("🎱 Draw Numbers!").setStyle(ButtonStyle.Primary),
    );
    const playAgainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("keno_again").setLabel("🔄 Play Again").setStyle(ButtonStyle.Primary),
    );

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeWaitEmbed(bet, picks)],
      components: [drawRow as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30_000,
    });

    const doDraw = async (i: any) => {
      const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (curBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`You only have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
        return collector.stop();
      }
      await i.update({ embeds: [new EmbedBuilder().setColor(0xffd740).setTitle("🎱  DRAWING...").setDescription("```\n  Drawing 20 numbers...\n```")], components: [] });
      await new Promise(r => setTimeout(r, 1200));
      const drawn = new Set<number>();
      while (drawn.size < 20) drawn.add(Math.floor(Math.random() * 40) + 1);
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      const hits = picks.filter(p => drawn.has(p));
      const mult = PAYOUT[hits.length] ?? 0;
      const payout = Math.floor(bet * mult);
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      await msg.edit({ embeds: [makeResultEmbed(bet, picks, drawn)], components: [playAgainRow as any] }).catch(() => {});
    };

    collector.on("collect", async i => {
      if (i.customId === "keno_draw") return doDraw(i);
      if (i.customId === "keno_again") {
        const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
        if (curBal.balance < bet) {
          await i.update({ embeds: [errorEmbed(`Insufficient balance. You have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
          return collector.stop();
        }
        await i.update({ embeds: [makeWaitEmbed(bet, picks)], components: [drawRow as any] });
      }
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [] }).catch(() => {});
    });
  },
};
