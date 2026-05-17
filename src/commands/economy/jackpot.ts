import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const SYMBOLS = ["💎", "7️⃣", "🍀", "⭐", "🔔", "🍋", "💀"];
const WEIGHTS  = [ 0.03, 0.05, 0.10, 0.15, 0.18, 0.25, 0.24];
const PAYOUT: Record<string, number> = { "💎": 50, "7️⃣": 20, "🍀": 10, "⭐": 5, "🔔": 3, "🍋": 2, "💀": 0 };

function pick() {
  let r = Math.random(), c = 0;
  for (let i = 0; i < SYMBOLS.length; i++) { c += WEIGHTS[i]!; if (r < c) return SYMBOLS[i]!; }
  return "💀";
}

function spin6() { return Array.from({ length: 6 }, pick); }

function calcMult(reels: string[]) {
  // Count matching sets
  const freq: Record<string, number> = {};
  for (const s of reels) freq[s] = (freq[s] ?? 0) + 1;
  const counts = Object.entries(freq).sort(([, a], [, b]) => b - a);
  const [top] = counts;
  if (!top) return 0;
  const [sym, cnt] = top;
  if (cnt === 6) return PAYOUT[sym]! * 10;
  if (cnt === 5) return PAYOUT[sym]! * 4;
  if (cnt === 4) return PAYOUT[sym]! * 2;
  if (cnt === 3) return PAYOUT[sym]!;
  return 0;
}

function makeSpin(reels: string[], spinning = false) {
  const top = spinning ? Array.from({ length: 6 }, pick) : null;
  const display = spinning
    ? `\`${top!.join(" | ")}\`\n\`${"─".repeat(17)}\`\n\`${reels.join(" | ")}\``
    : `\`${reels.join(" | ")}\``;
  return display;
}

export const command: HybridCommand = {
  name: "jackpot",
  description: "High-stakes 6-reel jackpot. Match symbols for massive multipliers!",
  usage: "jackpot [bet]",
  examples: ["jackpot"],
  category: "economy",
  guildOnly: true,
  aliases: ["jackpotslots", "megaslots", "jp"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });

    const spinRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("jp_spin").setLabel("🎰 Pull the Lever!").setStyle(ButtonStyle.Primary)
    );
    const againRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("jp_again").setLabel("🔄 Spin Again").setStyle(ButtonStyle.Primary)
    );

    const makeEmbed = (reels: string[], mult: number, done: boolean, bet: number) => {
      const net = Math.floor(bet * mult) - bet;
      return new EmbedBuilder()
        .setColor(done ? (mult > 0 ? 0x00e676 : 0xff1744) : 0x0f1923)
        .setTitle("🎰 MEGA JACKPOT — 6 REELS")
        .setDescription([
          "```",
          `  ${reels.join(" | ")}`,
          "```",
          done
            ? (mult > 0
              ? `**${reels.filter((s, i, a) => a.indexOf(s) !== i || (a.filter(x=>x===s).length > 2)).join("")}** ${mult}x → **+${net}** coins!`
              : "💀 **No match. Lost.**")
            : `💰 **Bet:** ${bet.toLocaleString()} coins`,
          !done ? "\nPull the lever to spin all 6 reels!" : "",
        ].join("\n"))
        .addFields(
          { name: "💎 6-match", value: "500x", inline: true },
          { name: "7️⃣ 6-match", value: "200x", inline: true },
          { name: "🍀 6-match", value: "100x", inline: true },
        )
        .setFooter({ text: `${config.embedFooter} • Jackpot` })
        .setTimestamp();
    };

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeEmbed(["🎰","🎰","🎰","🎰","🎰","🎰"], 0, false, bet)],
      components: [spinRow as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 60000,
    });

    const doSpin = async (i: any) => {
      const currentBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (currentBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`You only have **${currentBal.balance}** coins.`)], components: [] });
        return collector.stop();
      }

      // Animate
      const animReels = ["🎰","🎰","🎰","🎰","🎰","🎰"];
      await i.update({ embeds: [new EmbedBuilder().setColor(0xffd740).setTitle("🎰 SPINNING...").setDescription("```\n" + animReels.join(" | ") + "\n```")], components: [] });

      for (let f = 0; f < 5; f++) {
        await new Promise(r => setTimeout(r, 200));
        await msg.edit({ embeds: [new EmbedBuilder().setColor(0xffd740).setTitle("🎰 SPINNING...").setDescription("```\n" + Array.from({length:6}, pick).join(" | ") + "\n```")] }).catch(()=>{});
      }

      const reels = spin6();
      const mult = calcMult(reels);
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      const payout = Math.floor(bet * mult);
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      await msg.edit({ embeds: [makeEmbed(reels, mult, true, bet)], components: [againRow as any] }).catch(()=>{});
    };

    collector.on("collect", async i => {
      if (i.customId === "jp_spin") return doSpin(i);
      if (i.customId === "jp_again") {
        await i.update({ embeds: [makeEmbed(["🎰","🎰","🎰","🎰","🎰","🎰"], 0, false, bet)], components: [spinRow as any] });
      }
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [] }).catch(() => {});
    });
  },
};
