import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getEconomy, addBalance, removeBalance } from "../../features/economy.js";
import { errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "pvpflip",
  description: "Challenge another user to a coin flip bet.",
  usage: "pvpflip [user] [amount]",
  examples: ["pvpflip"],
  category: "economy",
  guildOnly: true,
  aliases: ["flip", "challenge"],
  options: [
    { name: "user", description: "User to challenge", type: ApplicationCommandOptionType.User, required: true },
    { name: "amount", description: "Coins to bet", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user", true);
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't challenge yourself.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("bots don't gamble.")] });

    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[1] ?? "0", 10);
    if (!amount || amount < 10) return ctx.reply({ embeds: [errorEmbed("minimum bet is 10 coins.")] });

    const challengerEco = await getEconomy(ctx.guild.id, ctx.user.id);
    if (challengerEco.balance < amount) return ctx.reply({ embeds: [errorEmbed(`you only have **${challengerEco.balance.toLocaleString()}** coins.`)] });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`pvpflip_accept_${ctx.user.id}_${target.id}_${amount}_${ctx.guild.id}`).setLabel("✅ accept").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`pvpflip_decline_${ctx.user.id}`).setLabel("❌ decline").setStyle(ButtonStyle.Danger),
    );

    const msg = await ctx.reply({
      content: `<@${target.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("🪙 coin flip challenge")
          .setDescription(`**${ctx.user.username}** challenges **${target.username}** to a coin flip!\n\n💰 **${amount.toLocaleString()} coins** on the line.\n\n<@${target.id}>, do you accept? (30 seconds)`)
          .setFooter({ text: `${config.embedFooter} • economy` })
          .setTimestamp(),
      ],
      components: [row as any],
    }) as any;

    const msgObj = ctx.source === "slash" ? await (ctx.raw as any).fetchReply().catch(() => null) : msg;

    const collector = msgObj?.createMessageComponentCollector?.({
      filter: (i: any) => i.customId.startsWith("pvpflip_") && (i.user.id === target.id || i.user.id === ctx.user.id),
      max: 1,
      time: 30_000,
    });

    collector?.on("collect", async (i: any) => {
      if (i.customId.startsWith("pvpflip_decline") || i.user.id !== target.id) {
        await i.update({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`**${target.username}** declined the challenge.`).setTimestamp()], components: [] }).catch(() => {});
        return;
      }

      const parts = i.customId.split("_");
      const challengerId = parts[2]!;
      const bet = parseInt(parts[4]!, 10);
      const gId = parts[5]!;

      const targetEco = await getEconomy(gId, target.id);
      if (targetEco.balance < bet) {
        await i.update({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`**${target.username}** doesn't have enough coins.`).setTimestamp()], components: [] }).catch(() => {});
        return;
      }

      const challengerEcoFresh = await getEconomy(gId, challengerId);
      if (challengerEcoFresh.balance < bet) {
        await i.update({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`challenger no longer has enough coins.`).setTimestamp()], components: [] }).catch(() => {});
        return;
      }

      const challengerWins = Math.random() < 0.5;
      const [winner, loser] = challengerWins ? [challengerId, target.id] : [target.id, challengerId];
      const winnerUser = challengerWins ? ctx.user : target;
      const loserUser = challengerWins ? target : ctx.user;

      await removeBalance(gId, loser, bet);
      await addBalance(gId, winner, bet);

      const sides = ["heads 🪙", "tails 🌑"];
      const result = sides[Math.floor(Math.random() * 2)]!;

      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(config.successColor)
            .setTitle(`🪙 ${result}`)
            .setDescription(`**${winnerUser.username}** wins **${bet.toLocaleString()} coins** from **${loserUser.username}**!`)
            .setFooter({ text: `${config.embedFooter} • economy` })
            .setTimestamp(),
        ],
        components: [],
      }).catch(() => {});
    });

    collector?.on("end", (c: any, reason: string) => {
      if (reason === "time" && !c.size) {
        ctx.followUp({ embeds: [new EmbedBuilder().setColor(config.neutralColor).setDescription(`⏰ challenge expired — **${target.username}** didn't respond.`).setTimestamp()], components: [] }).catch(() => {});
      }
    });
  },
};
