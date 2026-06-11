import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setgoodbye",
  description: "Configure the goodbye message.",
  usage: "setgoodbye [channel]",
  examples: ["setgoodbye"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "channel", description: "Goodbye channel", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "message", description: "Message ({user}, {server})", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel", true);
    const msg = ctx.getString("message", true);
    if (!channel || !msg) return ctx.reply({ embeds: [errorEmbed("**Channel** and message required.")] });
    await updateGuildSettings(ctx.guild.id, {
      goodbyeChannel: channel.id,
      goodbyeMessage: msg,
    });
    return ctx.reply({ embeds: [successEmbed(`Goodbye configured in <#${channel.id}>.`)] });
  },
};
