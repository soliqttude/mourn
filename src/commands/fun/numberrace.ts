import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "numberrace",
  aliases: ["numrace", "countrace"],
  description: "First person to type the secret number wins! Open to everyone."
  usage: "numberrace",
  examples: ["numberrace"],
  category: "fun",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel || !ctx.guild) return;
    const target = Math.floor(Math.random() * 900) + 100;

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("🔢 number race")
          .setDescription(`type a number between **100–999**.\nfirst to type the exact number wins!\n\n⏱ 60 seconds. anyone can play!`)
          .setFooter({ text: `${config.embedFooter} • fun` })
          .setTimestamp(),
      ],
    });

    const col = ctx.channel.createMessageCollector?.({
      filter: (m: any) => !m.author.bot && /^\d+$/.test(m.content.trim()),
      time: 60_000,
    });

    col?.on("collect", async (m: any) => {
      const guess = parseInt(m.content.trim(), 10);
      if (guess === target) {
        col.stop("won");
        await m.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.successColor)
              .setDescription(`🎉 **${m.author.username}** got it! the number was **${target}**.`)
              .setTimestamp(),
          ],
        });
      } else if (Math.abs(guess - target) <= 10) {
        await m.react("🔥").catch(() => {});
      } else if (Math.abs(guess - target) <= 50) {
        await m.react("🌡️").catch(() => {});
      }
    });

    col?.on("end", (_: any, reason: string) => {
      if (reason !== "won") {
        ctx.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(config.errorColor)
              .setDescription(`⏰ nobody got it! the number was **${target}**.`)
              .setTimestamp(),
          ],
        }).catch(() => {});
      }
    });
  },
};
