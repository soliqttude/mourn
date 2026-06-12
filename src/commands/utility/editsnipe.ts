import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getSnipe, getSnipeCount } from "../../features/snipes.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "editsnipe",
  aliases: ["es"],
  description: "Show the last edited message in this channel.",
  usage: "editsnipe [index]",
  examples: ["editsnipe", "editsnipe 2"],
  category: "utility",
  guildOnly: true,
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: "index",
      description: "Which edited message to show (1 = most recent)",
      required: false,
      minValue: 1,
      maxValue: 10,
    },
  ],
  async execute(ctx) {
    if (!ctx.channel) return;
    const index = Math.max(0, (ctx.getNumber("index") ?? 1) - 1);
    const snipe = getSnipe(ctx.channel.id, "edit", index);
    const total = getSnipeCount(ctx.channel.id, "edit");
    if (!snipe) return ctx.reply({ embeds: [errorEmbed("There's nothing to editsnipe.")] });

    const channelName = "name" in ctx.channel ? (ctx.channel as any).name as string : "unknown";
    const current = index + 1;

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setAuthor({ name: snipe.authorTag, iconURL: snipe.authorAvatar ?? undefined })
      .addFields(
        { name: "before", value: (snipe.content || "*(empty)*").slice(0, 1024), inline: false },
        { name: "after",  value: (snipe.after  || "*(empty)*").slice(0, 1024), inline: false },
      )
      .setTimestamp(snipe.at)
      .setFooter({ text: `${current} of ${total} \u00b7 #${channelName}` });

    return ctx.reply({ embeds: [embed] });
  },
};
