import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setwelcome",
  description: "Set the channel to send welcome messages in.",
  usage: "setwelcome [channel]",
  examples: ["setwelcome"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "channel", description: "Channel to send welcome messages in", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel", true);
    if (!channel) return ctx.reply({ embeds: [errorEmbed("Channel is required.")] });

    await updateGuildSettings(ctx.guild.id, { welcomeChannel: channel.id });
    return ctx.reply({ embeds: [successEmbed(`Welcome messages will be sent in <#${channel.id}>.`)] });
  },
};
