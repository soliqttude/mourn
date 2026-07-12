import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { ownerState } from "../../lib/ownerState.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "disablebot",
  description: "(Owner only) Toggle bot on/off in the current server.",
  usage: "disablebot",
  examples: ["disablebot"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const guildId = ctx.guild.id;
    const isDisabled = ownerState.disabledGuilds.has(guildId);

    if (isDisabled) {
      ownerState.disabledGuilds.delete(guildId);
    } else {
      ownerState.disabledGuilds.add(guildId);
    }

    const nowDisabled = ownerState.disabledGuilds.has(guildId);

    const embed = new EmbedBuilder()
      .setColor(nowDisabled ? 0xff4444 : config.successColor)
      .setTitle(nowDisabled ? "Bot Disabled" : "Bot Enabled")
      .setDescription(nowDisabled
        ? `mourn is now **disabled** in **${ctx.guild.name}**. no one can use commands here until you run this again.`
        : `mourn is back **online** in **${ctx.guild.name}**.`)
      .setFooter({ text: config.embedFooter })
      .setTimestamp();

    return ctx.reply({ embeds: [embed] });
  },
};
