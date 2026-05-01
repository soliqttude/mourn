import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setwelcome",
  description: "Configure the welcome message.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "channel", description: "Welcome channel", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "message", description: "Message ({user}, {server}, {memberCount})", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel", true);
    const msg = ctx.getString("message", true);
    if (!channel || !msg) return ctx.reply({ embeds: [errorEmbed("Channel and message required.")] });
    await updateGuildSettings(ctx.guild.id, {
      welcomeChannel: channel.id,
      welcomeMessage: msg,
    });
    return ctx.reply({ embeds: [successEmbed(`Welcome configured in <#${channel.id}>.`)] });
  },
};
