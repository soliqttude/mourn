import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function spin() { return Math.floor(Math.random() * 37); }

function resolve(num: number, choice: string): number {
  const isRed = REDS.has(num), isGreen = num === 0;
  const n = parseInt(choice);
  if (!isNaN(n) && n >= 0 && n <= 36) return n === num ? 36 : 0;
  if (choice === "red") return isRed ? 2 : 0;
  if (choice === "black") return (!isRed && !isGreen) ? 2 : 0;
  if (choice === "green") return isGreen ? 14 : 0;
  return 0;
}

function makeWaitEmbed(bet: number) {
  return new EmbedBuilder()
    .setColor(0x0f1923)
    .setTitle("🎡  R O U L E T T E")
    .setDescription([
      "```",
      "  Pick your bet type:",
      "",
      "  🔴 Red    — 2x payout",
      "  ⚫ Black  — 2x payout",
      "  🟢 Green  — 14x payout",
      "  🎯 Number — 36x payout",
      "```",
      `💰 **Bet:** $${bet.toLocaleString()}`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Roulette` })
    .setTimestamp();
}

function makeSpinningEmbed() {
  return new EmbedBuilder()
    .setColor(0xffd740)
    .setTitle("🎡  SPINNING...")
    .setDescription("```\n  🎡  The wheel is spinning...\n```")
    .setTimestamp();
}

function makeResultEmbed(num: number, choice: string, bet: number, mult: number) {
  const isRed = REDS.has(num), isGreen = num === 0;
  const emoji = isGreen ? "🟢" : isRed ? "🔴" : "⚫";
  const colorName = isGreen ? "green" : isRed ? "red" : "black";
  const payout = Math.floor(bet * mult);
  const net = payout - bet;
  const won = mult > 0;
  return new EmbedBuilder()
    .setColor(won ? 0x00e676 : 0xff1744)
    .setTitle(won ? "🎡  ROULETTE — WIN!" : "🎡  ROULETTE — LOSS")
    .setDescription([
      "```",
      `  Result    :  ${emoji}  ${num}  (${colorName})`,
      `  Your Pick :  ${choice.toUpperCase()}`,
      `  Bet       :  $${bet.toLocaleString()}`,
      `  Payout    :  $${payout.toLocaleString()}  (${mult}x)`,
      `  Net       :  ${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString()}`,
      "```",
      won ? `🎉 **You won +$${net.toLocaleString()}!**` : `💸 **The ball didn't land your way. Lost $${bet.toLocaleString()}.**`,
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Roulette` })
    .setTimestamp();
}

function choiceRow(disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("rl_red").setLabel("🔴 Red (2x)").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId("rl_black").setLabel("⚫ Black (2x)").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("rl_green").setLabel("🟢 Green (14x)").setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId("rl_num").setLabel("🎯 Number (36x)").setStyle(ButtonStyle.Primary).setDisabled(disabled),
  );
}

function playAgainRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("rl_again").setLabel("🔄 Spin Again").setStyle(ButtonStyle.Primary),
  );
}

async function doSpin(i: any, choice: string, bet: number, msg: any, guild: any) {
  await i.update({ embeds: [makeSpinningEmbed()], components: [] });
  await new Promise(r => setTimeout(r, 1200));
  const num = spin();
  const mult = resolve(num, choice);
  await removeBalance(guild.id, i.user.id, bet);
  const payout = Math.floor(bet * mult);
  if (payout > 0) await addBalance(guild.id, i.user.id, payout);
  await msg.edit({ embeds: [makeResultEmbed(num, choice, bet, mult)], components: [playAgainRow() as any] }).catch(() => {});
}

export const command: HybridCommand = {
  name: "roulette",
  description: "Spin the roulette! Pick Red, Black, Green, or a number 0-36.",
  usage: "roulette [bet] [choice]",
  examples: ["roulette"],
  category: "economy",
  guildOnly: true,
  aliases: ["rl"],
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "choice", description: "red | black | green | 0-36", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is **$1**.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    const quickChoice = (ctx.getString("choice") ?? ctx.args[1])?.toLowerCase().trim();
    if (quickChoice) {
      const num = spin();
      const mult = resolve(num, quickChoice);
      await removeBalance(ctx.guild.id, ctx.user.id, bet);
      const payout = Math.floor(bet * mult);
      if (payout > 0) await addBalance(ctx.guild.id, ctx.user.id, payout);
      return ctx.reply({ embeds: [makeResultEmbed(num, quickChoice, bet, mult)], components: [playAgainRow() as any] });
    }

    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeWaitEmbed(bet)],
      components: [choiceRow() as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30_000,
    });

    collector.on("collect", async i => {
      if (i.customId === "rl_again") {
        const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
        if (curBal.balance < bet) {
          await i.update({ embeds: [errorEmbed(`Insufficient balance. You have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
          return collector.stop();
        }
        await i.update({ embeds: [makeWaitEmbed(bet)], components: [choiceRow() as any] });
        return;
      }

      const choiceMap: Record<string, string> = { rl_red: "red", rl_black: "black", rl_green: "green" };

      if (i.customId === "rl_num") {
        await i.reply({ content: "Type a number **0–36** in chat:", ephemeral: true });
        const numCol = msg.channel.createMessageCollector({
          filter: m => m.author.id === ctx.user.id && !isNaN(parseInt(m.content)) && parseInt(m.content) >= 0 && parseInt(m.content) <= 36,
          time: 15_000, max: 1,
        });
        numCol.on("collect", async m => {
          m.delete().catch(() => {});
          const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
          if (curBal.balance < bet) {
            await msg.edit({ embeds: [errorEmbed("Insufficient balance!")], components: [] });
            return;
          }
          await doSpin({ update: async (p: any) => { await msg.edit(p); } }, m.content.trim(), bet, msg, ctx.guild!);
        });
        numCol.on("end", (c) => { if (!c.size) msg.edit({ components: [choiceRow(true) as any] }).catch(() => {}); });
        return;
      }

      const choice = choiceMap[i.customId] ?? "red";
      const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (curBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`Insufficient balance. You have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
        return collector.stop();
      }
      await doSpin(i, choice, bet, msg, ctx.guild!);
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [choiceRow(true) as any] }).catch(() => {});
    });
  },
};
