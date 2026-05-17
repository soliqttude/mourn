import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "suggestchannel",
  description: "Set the suggestions channel.",
  usage: "suggestchannel [channel]",
  examples: ["suggestchannel"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "channel", description: "Channel for suggestions", type: ApplicationCommandOptionType.Channel, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel");
    if (!ch) return;
    await updateGuildSettings(ctx.guild.id, { suggestionsChannel: ch.id } as any);
    return ctx.reply({ embeds: [successEmbed(`Suggestions will be posted in <#${ch.id}>.`)] });
  },
};
