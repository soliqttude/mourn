import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "duel",
  description: "Challenge another user to a coin flip duel. Loser pays the winner!",
  category: "economy",
  guildOnly: true,
  aliases: ["challenge", "bet"],
  options: [
    { name: "user", description: "Who to duel", type: ApplicationCommandOptionType.User, required: true },
    { name: "bet", description: "Coin amount", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const target = await ctx.getUser("user") ?? null;
    const targetId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[1] ?? "0");

    if (!targetId || !bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Usage: `,duel @user <amount>`")] });
    if (targetId === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't duel yourself.")] });

    const targetUser = await ctx.client.users.fetch(targetId).catch(() => null);
    if (!targetUser || targetUser.bot) return ctx.reply({ embeds: [errorEmbed("Invalid target.")] });

    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });

    const acceptRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("duel_accept").setLabel("⚔️ Accept Duel").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("duel_decline").setLabel("❌ Decline").setStyle(ButtonStyle.Danger),
    );

    const msg = await ctx.reply({
      content: `<@${targetId}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd740)
          .setTitle("⚔️ DUEL REQUEST")
          .setDescription([
            `**${ctx.user.tag}** challenges **${targetUser.tag}** to a coin duel!`,
            "",
            `💰 **Stakes:** ${bet.toLocaleString()} coins each`,
            `🎯 **Winner takes:** ${(bet * 2).toLocaleString()} coins`,
            "",
            `<@${targetId}> — accept or decline within 30 seconds.`,
          ].join("\n"))
          .setFooter({ text: `${config.embedFooter} • Duel` })
          .setTimestamp(),
      ],
      components: [acceptRow as any],
    }) as any;

    const msgObj = msg?.interaction?.message ?? msg;
    if (!msgObj?.createMessageComponentCollector) return;

    const collector = msgObj.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i: any) => i.user.id === targetId,
      time: 30000,
      max: 1,
    });

    collector.on("collect", async (i: any) => {
      if (i.customId === "duel_decline") {
        return i.update({
          embeds: [new EmbedBuilder().setColor(0xff1744).setTitle("⚔️ Duel Declined").setDescription(`**${targetUser.tag}** declined the duel.`)],
          components: [],
        });
      }

      // Accept
      const tbal = await getBalance(ctx.guild!.id, targetId);
      if (tbal.balance < bet) {
        return i.update({
          embeds: [errorEmbed(`**${targetUser.tag}** doesn't have enough coins!`)],
          components: [],
        });
      }

      await i.update({ embeds: [new EmbedBuilder().setColor(0xffd740).setTitle("⚔️ DUELING...").setDescription("🎲 Flipping coin...")], components: [] });
      await new Promise(r => setTimeout(r, 1500));

      const challengerWins = Math.random() < 0.5;
      const winner = challengerWins ? ctx.user : targetUser;
      const loser = challengerWins ? targetUser : ctx.user;
      const winnerId = winner.id, loserId = loser.id;

      await removeBalance(ctx.guild!.id, loserId, bet);
      await addBalance(ctx.guild!.id, winnerId, bet);

      await msgObj.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00e676)
            .setTitle("⚔️ DUEL COMPLETE")
            .setDescription([
              `🏆 **${winner.tag}** wins the duel!`,
              `💸 **${loser.tag}** loses ${bet.toLocaleString()} coins.`,
              "",
              `<@${winnerId}> pockets **${bet.toLocaleString()} coins**!`,
            ].join("\n"))
            .setFooter({ text: `${config.embedFooter} • Duel` })
            .setTimestamp(),
        ],
        components: [],
      }).catch(() => {});
    });

    collector.on("end", (c: any) => {
      if (!c.size) {
        msgObj.edit({
          embeds: [new EmbedBuilder().setColor(0x555555).setTitle("⚔️ Duel Expired").setDescription("The duel request timed out.")],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
