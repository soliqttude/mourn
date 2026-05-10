import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const SYMBOLS = ["💎", "7️⃣", "🍒", "⭐", "🎯", "💀"];
const WEIGHTS  = [0.04, 0.08, 0.20, 0.25, 0.25, 0.18];
const PAYOUTS: Record<string, number> = { "💎": 10, "7️⃣": 5, "🍒": 3, "⭐": 2, "🎯": 1.5, "💀": 0 };

function pickSymbol() {
  let r = Math.random(), cumul = 0;
  for (let i = 0; i < SYMBOLS.length; i++) {
    cumul += WEIGHTS[i]!;
    if (r < cumul) return SYMBOLS[i]!;
  }
  return SYMBOLS[SYMBOLS.length - 1]!;
}

function generateCard(): string[] {
  const card = Array.from({ length: 9 }, pickSymbol);
  if (Math.random() < 0.3) {
    const sym = pickSymbol();
    const row = Math.floor(Math.random() * 3) * 3;
    card[row] = card[row + 1] = card[row + 2] = sym;
  }
  return card;
}

function calcWinnings(card: string[], bet: number) {
  let mult = 0;
  for (let r = 0; r < 3; r++) {
    const a = card[r * 3]!, b = card[r * 3 + 1]!, c = card[r * 3 + 2]!;
    if (a === b && b === c) mult += PAYOUTS[a] ?? 0;
  }
  return Math.floor(bet * mult);
}

function buildGrid(revealed: boolean[], card: string[]) {
  return Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 3 }, (_, c) => {
      const idx = r * 3 + c;
      return revealed[idx] ? card[idx] : "❓";
    }).join("  ")
  ).join("\n");
}

export const command: HybridCommand = {
  name: "scratch",
  description: "Buy a scratch card! Reveal all tiles to see if you win.",
  category: "economy",
  guildOnly: true,
  aliases: ["scratchcard", "lotto"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });
    await removeBalance(ctx.guild.id, ctx.user.id, bet);

    const card = generateCard();
    const revealed = new Array(9).fill(false);

    const buildButtons = (done = false) => {
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`sc_${idx}`)
              .setLabel(revealed[idx] ? card[idx]! : "❓")
              .setStyle(revealed[idx] ? ButtonStyle.Secondary : ButtonStyle.Primary)
              .setDisabled(done || revealed[idx]),
          );
        }
        rows.push(row);
      }
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("sc_reveal_all").setLabel("✨ Reveal All").setStyle(ButtonStyle.Success).setDisabled(done),
      ));
      return rows;
    };

    const makeEmbed = (done = false, winnings = 0) => {
      const net = winnings - bet;
      return new EmbedBuilder()
        .setColor(done ? (winnings > 0 ? 0x00e676 : 0xff1744) : 0x0f1923)
        .setTitle("🎟️  S C R A T C H  C A R D")
        .setDescription([
          "```",
          buildGrid(done ? new Array(9).fill(true) : revealed, card),
          "```",
          "```",
          done
            ? [
                `  Bet      :  $${bet.toLocaleString()}`,
                `  Payout   :  $${winnings.toLocaleString()}`,
                `  Net      :  ${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString()}`,
              ].join("\n")
            : `  Bet      :  $${bet.toLocaleString()}\n  Scratch the tiles or hit Reveal All!`,
          "```",
          done
            ? winnings > 0
              ? `🎉 **Match! Won $${winnings.toLocaleString()}** (+$${net.toLocaleString()}).`
              : `💸 **No match. Lost $${bet.toLocaleString()}.**`
            : "💡 **Tip:** Match 3-in-a-row across any row to win!",
          "💎=10x  7️⃣=5x  🍒=3x  ⭐=2x  🎯=1.5x",
        ].join("\n"))
        .setFooter({ text: `${config.embedFooter} • Scratch` })
        .setTimestamp();
    };

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeEmbed()],
      components: buildButtons() as any[],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 120_000,
    });

    collector.on("collect", async i => {
      if (i.customId === "sc_reveal_all") {
        const winnings = calcWinnings(card, bet);
        if (winnings > 0) await addBalance(ctx.guild!.id, ctx.user.id, winnings);
        await i.update({ embeds: [makeEmbed(true, winnings)], components: [] });
        return collector.stop("done");
      }
      const idx = parseInt(i.customId.replace("sc_", ""));
      if (!isNaN(idx)) {
        revealed[idx] = true;
        if (revealed.every(Boolean)) {
          const winnings = calcWinnings(card, bet);
          if (winnings > 0) await addBalance(ctx.guild!.id, ctx.user.id, winnings);
          await i.update({ embeds: [makeEmbed(true, winnings)], components: [] });
          return collector.stop("done");
        }
        await i.update({ embeds: [makeEmbed()], components: buildButtons() as any[] });
      }
    });

    collector.on("end", (_, reason) => {
      if (reason !== "done") msg.edit({ embeds: [makeEmbed(true, 0)], components: [] }).catch(() => {});
    });
  },
};
