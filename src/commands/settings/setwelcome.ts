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
    { name: "message", description: "Message ({user.mention}, {server}, {member_count})", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel", true);
    const msg = ctx.getString("message", true);

    if (!channel) return ctx.reply({ embeds: [errorEmbed("Channel is required.")] });
    if (!msg) return ctx.reply({ embeds: [errorEmbed("Message is required.")] });

    await updateGuildSettings(ctx.guild.id, {
      welcomeChannel: channel.id,
      welcomeMessage: msg,
      welcomeMode: null,
    });
    return ctx.reply({ embeds: [successEmbed(`Welcome configured in <#${channel.id}>.`)] });
  },
};
