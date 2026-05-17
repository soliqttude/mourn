import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const MULTS = [1.5, 1.8, 2.2, 2.8, 3.5, 4.5, 6, 8, 11, 15];
const ROWS = 10;

export const command: HybridCommand = {
  name: "towers",
  description: "Climb the tower — pick the safe tile each level. Cash out before you fall!",
  usage: "towers [bet]",
  examples: ["towers"],
  category: "economy",
  guildOnly: true,
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });
    await removeBalance(ctx.guild.id, ctx.user.id, bet);

    // Each row: index of the bomb (0,1,2)
    const bombs = Array.from({ length: ROWS }, () => Math.floor(Math.random() * 3));
    let level = 0, mult = 1.0, ended = false;
    const cleared: { level: number; safe: number; bomb: number }[] = [];

    const tRow = (d = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
      [0, 1, 2].map(c =>
        new ButtonBuilder().setCustomId(`tw_${c}`).setLabel(`Column ${c + 1}`).setStyle(ButtonStyle.Primary).setDisabled(d),
      ),
    );
    const cRow = (d = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("tw_co")
        .setLabel(`💎 Cash Out — $${Math.floor(bet * mult).toLocaleString()}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(d || level === 0),
    );

    const makeEmbed = (state: "playing" | "won" | "dead") => {
      const payout = Math.floor(bet * mult);
      const net = payout - bet;
      const rows = Array.from({ length: ROWS }, (_, r) => {
        const ri = ROWS - 1 - r;
        const cl = cleared.find(c => c.level === ri);
        const isCurrent = ri === level && state === "playing";
        if (cl) {
          return [0, 1, 2].map(c => c === cl.bomb ? "💣" : c === cl.safe ? "✅" : "▫").join(" ") +
            (ri === level - 1 ? "  ← cleared" : "");
        }
        if (isCurrent) return "🟦 🟦 🟦  ← pick a column";
        return "▫  ▫  ▫";
      });
      return new EmbedBuilder()
        .setColor(state === "won" ? 0x00e676 : state === "dead" ? 0xff1744 : 0x0f1923)
        .setTitle(
          state === "won" ? "🗼  TOWERS — CASHED OUT!" :
          state === "dead" ? "🗼  TOWERS — BOMB HIT!" :
          `🗼  TOWERS — Level ${level + 1}/${ROWS}`,
        )
        .setDescription([
          "```",
          ...rows,
          "```",
          "```",
          `  Level       :  ${level}/${ROWS}`,
          `  Multiplier  :  ${mult.toFixed(2)}x`,
          `  Bet         :  $${bet.toLocaleString()}`,
          state !== "playing" ? `  Payout      :  $${payout.toLocaleString()}  (${net >= 0 ? "+" : ""}$${net.toLocaleString()})` : `  Cash Out    :  $${payout.toLocaleString()}`,
          "```",
          state === "won" ? `💎 **Cashed out successfully!** +$${net.toLocaleString()}` :
          state === "dead" ? `💥 **You hit a bomb!** Lost **$${bet.toLocaleString()}**.` : "",
        ].join("\n"))
        .setFooter({ text: `${config.embedFooter} • Towers` })
        .setTimestamp();
    };

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeEmbed("playing")],
      components: [tRow() as any, cRow() as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 120_000,
    });

    collector.on("collect", async i => {
      if (ended) return i.deferUpdate().catch(() => {});

      if (i.customId === "tw_co") {
        ended = true;
        const payout = Math.floor(bet * mult);
        await addBalance(ctx.guild!.id, ctx.user.id, payout);
        await i.update({ embeds: [makeEmbed("won")], components: [] });
        return collector.stop("done");
      }

      const col = parseInt(i.customId.replace("tw_", ""));
      const bomb = bombs[level]!;
      cleared.push({ level, safe: col, bomb });

      if (col === bomb) {
        ended = true;
        await i.update({ embeds: [makeEmbed("dead")], components: [] });
        return collector.stop("done");
      }

      mult = +(mult * MULTS[level]!).toFixed(2);
      level++;

      if (level >= ROWS) {
        ended = true;
        const payout = Math.floor(bet * mult);
        await addBalance(ctx.guild!.id, ctx.user.id, payout);
        await i.update({ embeds: [makeEmbed("won")], components: [] });
        return collector.stop("done");
      }

      await i.update({ embeds: [makeEmbed("playing")], components: [tRow() as any, cRow() as any] });
    });

    collector.on("end", async (_, reason) => {
      if (!ended) {
        ended = true;
        await msg.edit({ embeds: [makeEmbed("dead")], components: [] }).catch(() => {});
      }
    });
  },
};
