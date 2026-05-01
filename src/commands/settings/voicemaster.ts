import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "voicemaster",
  aliases: ["vm"],
  description: "Set the voicemaster join-to-create hub.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "hub", description: "Voice channel that creates new VCs", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const hub = ctx.getChannel("hub", true) as any;
    if (!hub) return ctx.reply({ embeds: [errorEmbed("Channel required.")] });
    if (hub.type !== ChannelType.GuildVoice) {
      return ctx.reply({ embeds: [errorEmbed("Must be a voice channel.")] });
    }
    await updateGuildSettings(ctx.guild.id, {
      voicemasterHub: hub.id,
      voicemasterCategory: hub.parentId ?? null,
    });
    return ctx.reply({ embeds: [successEmbed(`Voicemaster hub set to <#${hub.id}>.`)] });
  },
};
