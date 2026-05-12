import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getGuildSettings } from "../../db/settings.js";
import { activeDrop } from "../../features/drops.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "drops",
  description: "Check if there's an active coin drop in this server.",
  category: "economy",
  guildOnly: true,
  aliases: ["drop", "checkdrop"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const settings = await getGuildSettings(ctx.guild.id);
    if (!settings.dropChannel) {
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.neutralColor)
            .setDescription("no drop channel configured. admins can use `/dropsetup channel:` to enable drops.")
            .setFooter({ text: `${config.embedFooter} • economy` })
            .setTimestamp(),
        ],
      });
    }

    const drop = activeDrop.get(ctx.guild.id);
    if (!drop) {
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.neutralColor)
            .setDescription(`no active drop right now. drops appear in <#${settings.dropChannel}> every 2–4 hours.`)
            .setFooter({ text: `${config.embedFooter} • economy` })
            .setTimestamp(),
        ],
      });
    }

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf9c74f)
          .setTitle("🎁 active drop!")
          .setDescription(`there's an active drop in <#${settings.dropChannel}>!\n\ntype \`claim\` in that channel to grab **${drop.amount.toLocaleString()} coins**!`)
          .setFooter({ text: `${config.embedFooter} • economy` })
          .setTimestamp(),
      ],
    });
  },
};
