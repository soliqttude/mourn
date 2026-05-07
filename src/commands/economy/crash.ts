import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
function genCrash(): number {
  if (Math.random() < 0.01) return +(Math.random() * 0.8 + 0.2).toFixed(2);
  return +Math.min(0.99 / (1 - Math.random()), 100).toFixed(2);
}
export const command: HybridCommand = {
  name: "crash", description: "Bet coins — multiplier rises until it crashes. Cash out in time!", category: "economy", guildOnly: true, aliases: ["crashgame"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const crashPoint = genCrash();
    let current = 1.00, ended = false, cashedOut = false;
    const makeEmbed = (state: "live"|"cashed"|"crashed") => new EmbedBuilder()
      .setColor(state === "crashed" ? 0xff1744 : state === "cashed" ? 0x00e676 : 0x0f1923)
      .setTitle(state === "crashed" ? "💥 CRASH — BUSTED" : state === "cashed" ? "💎 CRASH — CASHED OUT" : "🚀 CRASH — LIVE")
      .setDescription(["```",
        `  Multiplier  :  ${current.toFixed(2)}x`,
        `  Bet         :  ${bet} coins`,
        `  Value       :  ${Math.floor(bet * current)} coins`,
        "```",
        state === "crashed" ? "💥 **The rocket crashed!** Your bet is gone." :
        state === "cashed" ? `💎 **Cashed out at ${current.toFixed(2)}x!** Won **+${Math.floor(bet * current) - bet}** coins.` :
        "🚀 *Click **CASH OUT** before it crashes!*",
      ].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Crash` }).setTimestamp();
    const makeRow = (d = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("crash_co").setLabel("💎 CASH OUT").setStyle(ButtonStyle.Success).setDisabled(d));
    if (ctx.source === "slash") await ctx.defer();
    const msg = await ctx.channel.send({ embeds: [makeEmbed("live")], components: [makeRow() as any] });
    const interval = setInterval(async () => {
      if (ended) return;
      current = +(current * 1.07).toFixed(2);
      if (current >= crashPoint) {
        ended = true; clearInterval(interval); collector.stop();
        await msg.edit({ embeds: [makeEmbed("crashed")], components: [] }).catch(() => {});
      } else await msg.edit({ embeds: [makeEmbed("live")], components: [makeRow() as any] }).catch(() => {});
    }, 1200);
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === ctx.user.id, time: 90000 });
    collector.on("collect", async i => {
      if (ended || cashedOut) return i.deferUpdate().catch(() => {});
      cashedOut = true; ended = true; clearInterval(interval);
      await addBalance(ctx.guild!.id, ctx.user.id, Math.floor(bet * current));
      await i.update({ embeds: [makeEmbed("cashed")], components: [] }); collector.stop();
    });
    collector.on("end", async () => { if (!ended) { ended = true; clearInterval(interval); await msg.edit({ embeds: [makeEmbed("crashed")], components: [] }).catch(() => {}); } });
  },
};