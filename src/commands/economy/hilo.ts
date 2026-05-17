import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const V = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const S = ["♠","♥","♦","♣"];
const R: Record<string,number> = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};
const draw = () => ({ v: V[Math.floor(Math.random()*13)]!, s: S[Math.floor(Math.random()*4)]! });
const cs = (c:{v:string;s:string}) => `${c.v}${c.s}`;

export const command: HybridCommand = {
  name: "hilo",
  description: "Guess if the next card is higher or lower. Keep streaking to multiply!",
  usage: "hilo [bet]",
  examples: ["hilo"],
  category: "economy",
  guildOnly: true,
  aliases: ["highlow","hilow"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });
    await removeBalance(ctx.guild.id, ctx.user.id, bet);

    let cur = draw(), mult = 1.0, round = 1, ended = false;

    const makeEmbed = (state: "playing"|"won"|"lost", nextCard?: {v:string;s:string}) => {
      const payout = Math.floor(bet * mult);
      const net = payout - bet;
      const lines = [
        "```",
        `  Current Card  :  ${cs(cur)}`,
        nextCard ? `  Next Card     :  ${cs(nextCard)}` : "",
        `  Round         :  ${round}`,
        `  Multiplier    :  ${mult.toFixed(2)}x`,
        `  Bet           :  $${bet.toLocaleString()}`,
        `  Potential     :  $${payout.toLocaleString()}`,
        "```",
      ].filter(Boolean);
      if (state !== "playing") {
        lines.push(`  Payout: $${payout.toLocaleString()}  (${net >= 0 ? "+" : ""}$${net.toLocaleString()})`);
      }
      return new EmbedBuilder()
        .setColor(state === "won" ? 0x00e676 : state === "lost" ? 0xff1744 : 0x0f1923)
        .setTitle(
          state === "won" ? "🃏  HI-LO — CASHED OUT!" :
          state === "lost" ? "🃏  HI-LO — WRONG GUESS!" :
          `🃏  HI-LO — Round ${round}`,
        )
        .setDescription([
          ...lines,
          state === "won" ? `\n💎 **Cashed out at ${mult.toFixed(2)}x!** Won **$${payout.toLocaleString()}** (+$${net.toLocaleString()}).` :
          state === "lost" ? `\n💥 **Wrong call!** Lost **$${bet.toLocaleString()}**.` :
          "\nIs the next card **Higher** or **Lower**?",
        ].join("\n"))
        .setFooter({ text: `${config.embedFooter} • Hi-Lo` })
        .setTimestamp();
    };

    const makeRow = (d = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("hl_hi").setLabel("⬆ Higher").setStyle(ButtonStyle.Primary).setDisabled(d),
      new ButtonBuilder().setCustomId("hl_lo").setLabel("⬇ Lower").setStyle(ButtonStyle.Danger).setDisabled(d),
      new ButtonBuilder().setCustomId("hl_co").setLabel(`💎 Cash Out ($${Math.floor(bet * mult).toLocaleString()})`).setStyle(ButtonStyle.Success).setDisabled(d || round === 1),
    );

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeEmbed("playing")],
      components: [makeRow() as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 60_000,
    });

    collector.on("collect", async i => {
      if (ended) return i.deferUpdate().catch(() => {});

      if (i.customId === "hl_co") {
        ended = true;
        const payout = Math.floor(bet * mult);
        await addBalance(ctx.guild!.id, ctx.user.id, payout);
        await i.update({ embeds: [makeEmbed("won")], components: [] });
        return collector.stop("done");
      }

      const next = draw();
      const guessedHigh = i.customId === "hl_hi";
      const ok = guessedHigh ? R[next.v]! > R[cur.v]! : R[next.v]! < R[cur.v]!;

      if (!ok) {
        ended = true;
        await i.update({ embeds: [makeEmbed("lost", next)], components: [] });
        return collector.stop("done");
      }

      mult = +(mult * (1.35 + Math.random() * 0.45)).toFixed(2);
      cur = next;
      round++;
      await i.update({ embeds: [makeEmbed("playing")], components: [makeRow() as any] });
    });

    collector.on("end", async (_, reason) => {
      if (!ended) {
        ended = true;
        await msg.edit({ embeds: [makeEmbed("lost")], components: [] }).catch(() => {});
      }
    });
  },
};
