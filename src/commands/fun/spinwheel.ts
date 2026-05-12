import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "spinwheel",
  description: "Spin a custom wheel and pick a random option.",
  category: "fun",
  aliases: ["spin", "choose"],
  options: [
    { name: "options", description: "Comma-separated options to spin (e.g. pizza,tacos,ramen)", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const raw = ctx.getString("options") ?? ctx.rawArgs;
    const opts = raw.split(",").map(o => o.trim()).filter(o => o.length > 0);
    if (opts.length < 2) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("give me at least 2 options, separated by commas.")] });
    if (opts.length > 20) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("max 20 options.")] });

    const winner = opts[Math.floor(Math.random() * opts.length)]!;
    const display = opts.map(o => o === winner ? `**→ ${o} ←**` : o).join("\n");

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("🎡 wheel spin")
          .addFields(
            { name: "options", value: display.slice(0, 1000), inline: false },
            { name: "🏆 result", value: `**${winner}**`, inline: false },
          )
          .setFooter({ text: `${config.embedFooter} • totally random, i promise` })
          .setTimestamp(),
      ],
    });
  },
};
