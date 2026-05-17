import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "gamble",
  description: "Bet on a 50/50 coin flip — double or nothing.",
  usage: "gamble [amount]",
  examples: ["gamble"],
  category: "economy",
  guildOnly: true,
  aliases: ["flip", "coinbet"],
  options: [
    { name: "amount", description: "Amount to bet (or 'all')", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    const raw = (ctx.getString("amount", true) ?? ctx.args[0] ?? "").toLowerCase();
    let bet = raw === "all" ? bal.balance : parseInt(raw);
    if (!Number.isFinite(bet) || bet < 1) return ctx.reply({ embeds: [errorEmbed("Provide a valid bet amount (min $1).")] });
    if (bet > bal.balance) return ctx.reply({ embeds: [errorEmbed(`You only have **$${bal.balance.toLocaleString()}**.`)] });

    if (ctx.source === "slash") await ctx.defer();

    const win = Math.random() < 0.5;
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    if (win) await addBalance(ctx.guild.id, ctx.user.id, bet * 2);
    const newBal = bal.balance + (win ? bet : -bet);
    const net = win ? bet : -bet;
    const netStr = win ? `+$${bet.toLocaleString()}` : `-$${bet.toLocaleString()}`;

    const embed = new EmbedBuilder()
      .setColor(win ? 0x00e676 : 0xff1744)
      .setTitle(win ? "🪙  COIN FLIP — YOU WIN!" : "🪙  COIN FLIP — YOU LOSE")
      .setDescription([
        "```",
        `  Result   :  ${win ? "HEADS ✅" : "TAILS ❌"}`,
        `  Bet      :  $${bet.toLocaleString()}`,
        `  Payout   :  ${win ? `$${(bet * 2).toLocaleString()}` : "$0"}`,
        `  Net      :  ${netStr}`,
        `  Balance  :  $${newBal.toLocaleString()}`,
        "```",
        win
          ? `🏆 **Doubled up!** Your wallet's looking healthy.`
          : `💸 **Better luck next time.** The house always has a say.`,
      ].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Gamble` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("gamble_again").setLabel("🔄 Flip Again").setStyle(ButtonStyle.Primary),
    );

    const msg = await ctx.channel.send({ content: `<@${ctx.user.id}>`, embeds: [embed], components: [row as any] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === ctx.user.id,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async i => {
      const curBal = await getBalance(ctx.guild!.id, ctx.user.id);
      if (curBal.balance < bet) {
        await i.update({ embeds: [errorEmbed(`Insufficient balance. You have **$${curBal.balance.toLocaleString()}**.`)], components: [] });
        return;
      }
      const win2 = Math.random() < 0.5;
      await removeBalance(ctx.guild!.id, ctx.user.id, bet);
      if (win2) await addBalance(ctx.guild!.id, ctx.user.id, bet * 2);
      const newBal2 = curBal.balance + (win2 ? bet : -bet);
      const embed2 = new EmbedBuilder()
        .setColor(win2 ? 0x00e676 : 0xff1744)
        .setTitle(win2 ? "🪙  COIN FLIP — YOU WIN!" : "🪙  COIN FLIP — YOU LOSE")
        .setDescription([
          "```",
          `  Result   :  ${win2 ? "HEADS ✅" : "TAILS ❌"}`,
          `  Bet      :  $${bet.toLocaleString()}`,
          `  Payout   :  ${win2 ? `$${(bet * 2).toLocaleString()}` : "$0"}`,
          `  Net      :  ${win2 ? `+$${bet.toLocaleString()}` : `-$${bet.toLocaleString()}`}`,
          `  Balance  :  $${newBal2.toLocaleString()}`,
          "```",
          win2 ? `🏆 **Doubled up!**` : `💸 **Better luck next time.**`,
        ].join("\n"))
        .setFooter({ text: `${config.embedFooter} • Gamble` })
        .setTimestamp();
      await i.update({ embeds: [embed2], components: [row as any] });
    });

    collector.on("end", (c) => {
      if (!c.size) msg.edit({ components: [] }).catch(() => {});
    });
  },
};
