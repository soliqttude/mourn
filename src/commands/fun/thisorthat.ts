import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const QUESTIONS = [
  ["Netflix", "YouTube"], ["Dogs", "Cats"], ["Morning", "Night"],
  ["Pizza", "Burgers"], ["Beach", "Mountains"], ["Coffee", "Tea"],
  ["Marvel", "DC"], ["Summer", "Winter"], ["Spotify", "Apple Music"],
  ["iPhone", "Android"], ["Books", "Movies"], ["Saving", "Spending"],
  ["Solo trip", "Group trip"], ["Call", "Text"], ["Fast food", "Home cooked"],
  ["Discord", "Slack"], ["City life", "Countryside"], ["Gaming", "Sports"],
  ["Cats", "Dogs"], ["Rice", "Bread"], ["Tattoos", "Piercings"],
  ["Early riser", "Night owl"], ["Introvert", "Extrovert"], ["Logic", "Emotion"],
  ["Cake", "Pie"], ["Rain", "Sunshine"], ["Past", "Future"],
  ["Invisibility", "Flying"], ["Wealth", "Fame"], ["Social media", "No social media"],
];

export const command: HybridCommand = {
  name: "thisorthat",
  description: "This or That — pick your preference from random choices!",
  category: "fun",
  aliases: ["tot", "wouldyourather", "wyr"],
  async execute(ctx) {
    const [a, b] = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]!;
    const votes: Record<string, string> = {};

    const makeEmbed = () => {
      const aVotes = Object.values(votes).filter(v => v === "a").length;
      const bVotes = Object.values(votes).filter(v => v === "b").length;
      const total = aVotes + bVotes;
      const bar = (n: number) => total > 0 ? "█".repeat(Math.round((n / total) * 10)) + "░".repeat(10 - Math.round((n / total) * 10)) : "░".repeat(10);

      return new EmbedBuilder()
        .setColor(0x8b0000)
        .setTitle("🤔 This or That?")
        .setDescription([
          `**${a}** vs **${b}**`,
          "",
          `🔴 **${a}** · ${aVotes} vote${aVotes !== 1 ? "s" : ""}`,
          `\`${bar(aVotes)}\``,
          "",
          `🔵 **${b}** · ${bVotes} vote${bVotes !== 1 ? "s" : ""}`,
          `\`${bar(bVotes)}\``,
          "",
          `👥 Total votes: ${total}`,
        ].join("\n"))
        .setFooter({ text: `${config.embedFooter} • Voting closes in 30s` })
        .setTimestamp();
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("tot_a").setLabel(`🔴 ${a}`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("tot_b").setLabel(`🔵 ${b}`).setStyle(ButtonStyle.Primary),
    );

    const msg = await ctx.reply({ embeds: [makeEmbed()], components: [row as any] }) as any;
    const msgObj = msg?.interaction?.message ?? msg;
    if (!msgObj?.createMessageComponentCollector) return;

    const collector = msgObj.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    collector.on("collect", async (i: any) => {
      votes[i.user.id] = i.customId === "tot_a" ? "a" : "b";
      await i.update({ embeds: [makeEmbed()], components: [row as any] });
    });

    collector.on("end", async () => {
      const aVotes = Object.values(votes).filter(v => v === "a").length;
      const bVotes = Object.values(votes).filter(v => v === "b").length;
      const winner = aVotes > bVotes ? a : bVotes > aVotes ? b : "Tie!";
      await msgObj.edit({
        embeds: [makeEmbed().setTitle("🤔 This or That? — Results").setFooter({ text: `${config.embedFooter} • Winner: ${winner}` })],
        components: [],
      }).catch(() => {});
    });
  },
};
