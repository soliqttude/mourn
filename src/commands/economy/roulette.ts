import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, type ActionRow } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
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
    .setTitle("🎡 ROULETTE")
    .setDescription([
      "```",
      "  Pick your bet type below!",
      "```",
      `💰 **Bet:** ${bet} coins`,
      "",
      "🔴 **Red** — 2x | ⚫ **Black** — 2x | 🟢 **Green** — 14x | 🎯 **Number** — 36x",
    ].join("\n"))
    .setFooter({ text: `${config.embedFooter} • Roulette` })
    .setTimestamp();
}

function makeResultEmbed(num: number, choice: string, bet: number, mult: number) {
  const isRed = REDS.has(num), isGreen = num === 0;
  const emoji = isGreen ? "🟢" : isRed ? "🔴" : "⚫";
  const colorName = isGreen ? "green" : isRed ? "red" : "black";
  const net = Math.floor(bet * mult) - bet;
  const won = mult > 0;
  return new EmbedBuilder()
    .setColor(won ? 0x00e676 : 0xff1744)
    .setTitle(`🎡 ROULETTE — ${won ? "WIN!" : "LOSS"}`)
    .setDescription([
      "```",
      `  Result    :  ${emoji}  ${num}  (${colorName})`,
      `  Your Pick :  ${choice.toUpperCase()}`,
      `  Bet       :  ${bet} coins`,
      `  Payout    :  ${mult}x`,
      `  Net       :  ${net >= 0 ? "+" : ""}${net} coins`,
      "```",
      won ? `🎉 **You won +${net} coins!**` : "💸 **Better luck next time.**",
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
    new ButtonBuilder().setCustomId("rl_again").setLabel("🔄 Play Again").setStyle(ButtonStyle.Primary),
  );
}

export const command: HybridCommand = {
  name: "roulette",
  description: "Spin the roulette wheel! Choose Red, Black, Green, or a number.",
  category: "economy",
  guildOnly: true,
  aliases: ["rl", "spin"],
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "choice", description: "red | black | green | 0-36", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    const quickChoice = ctx.getString("choice") ?? ctx.args[1];

    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });

    // If quick choice given (prefix style), resolve immediately
    if (quickChoice) {
      const choice = quickChoice.toLowerCase().trim();
      const num = spin();
      const mult = resolve(num, choice);
      await removeBalance(ctx.guild.id, ctx.user.id, bet);
      const payout = Math.floor(bet * mult);
      if (payout > 0) await addBalance(ctx.guild.id, ctx.user.id, payout);
      return ctx.reply({
        embeds: [makeResultEmbed(num, choice, bet, mult)],
        components: [playAgainRow() as any],
      });
    }

    // Interactive button selection
    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({
      content: `<@${ctx.user.id}>`,
      embeds: [makeWaitEmbed(bet)],
      components: [choiceRow() as any],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30000,
      max: 1,
    });

    collector.on("collect", async i => {
      if (i.customId === "rl_again") return;
      const choiceMap: Record<string, string> = { rl_red: "red", rl_black: "black", rl_green: "green" };
      let choice = choiceMap[i.customId] ?? "red";

      if (i.customId === "rl_num") {
        // For number bets without a modal, pick random number for fun or ask in reply
        await i.reply({ content: "Type a number 0-36 in chat!", ephemeral: true });
        const numCollector = msg.channel.createMessageCollector({
          filter: m => m.author.id === ctx.user.id && !isNaN(parseInt(m.content)) && parseInt(m.content) >= 0 && parseInt(m.content) <= 36,
          time: 15000, max: 1,
        });
        numCollector.on("collect", async m => {
          choice = m.content.trim();
          m.delete().catch(() => {});
          const currentBal = await getBalance(ctx.guild!.id, ctx.user.id);
          if (currentBal.balance < bet) {
            await msg.edit({ embeds: [errorEmbed("Insufficient balance!")], components: [] });
            return;
          }
          const num = spin();
          const mult = resolve(num, choice);
          await removeBalance(ctx.guild!.id, ctx.user.id, bet);
          const payout = Math.floor(bet * mult);
          if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
          await msg.edit({ embeds: [makeResultEmbed(num, choice, bet, mult)], components: [playAgainRow() as any] });
        });
        numCollector.on("end", (c) => { if (!c.size) msg.edit({ embeds: [errorEmbed("Timed out.")], components: [] }).catch(() => {}); });
        return;
      }

      await i.deferUpdate();
      const currentBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (currentBal.balance < bet) {
        await msg.edit({ embeds: [errorEmbed("Insufficient balance!")], components: [] });
        return;
      }
      const num = spin();
      const mult = resolve(num, choice);
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      const payout = Math.floor(bet * mult);
      if (payout > 0) await addBalance(ctx.guild!.id, ctx.user.id, payout);
      await msg.edit({ embeds: [makeResultEmbed(num, choice, bet, mult)], components: [playAgainRow() as any] });
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ embeds: [makeWaitEmbed(bet)], components: [choiceRow(true) as any] }).catch(() => {});
    });
  },
};
