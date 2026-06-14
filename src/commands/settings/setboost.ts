import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setboost",
  description: "Configure the boost notification.",
  usage: "setboost [channel]",
  examples: ["setboost"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "channel", description: "Boost channel", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "message", description: "Message ({user}, {server})", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel", true);
    const msg = ctx.getString("message", true);
    if (!channel || !msg) return ctx.reply({ embeds: [errorEmbed("**Channel** and message required.")] });
    await updateGuildSettings(ctx.guild.id, {
      boostChannel: channel.id,
      boostMessage: msg,
    });
    return ctx.reply({ embeds: [successEmbed(`Boost message configured in <#${channel.id}>.`)] });
  },
};
