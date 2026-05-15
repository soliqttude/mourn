import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
import { extractId } from "../../lib/parsing.js";

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

    // For slash commands use the built-in channel resolver.
    // For prefix commands, getChannel() filters out voice channels (isTextBased),
    // so we resolve directly from the guild cache using the raw arg.
    let hub: any = null;
    if (ctx.source === "slash") {
      hub = ctx.getChannel("hub") as any;
    } else {
      const raw = ctx.args[0];
      if (raw) {
        const id = extractId(raw) ?? raw.replace(/^#/, "");
        hub = ctx.guild.channels.cache.get(id) ??
          ctx.guild.channels.cache.find(c => c.name.toLowerCase() === id.toLowerCase()) ??
          null;
      }
    }

    if (!hub) return ctx.reply({ embeds: [errorEmbed("Please provide a voice channel.")] });
    if (hub.type !== ChannelType.GuildVoice) {
      return ctx.reply({ embeds: [errorEmbed("That has to be a **voice channel**, not a text channel.")] });
    }
    await updateGuildSettings(ctx.guild.id, {
      voicemasterHub: hub.id,
      voicemasterCategory: hub.parentId ?? null,
    });
    return ctx.reply({ embeds: [successEmbed(`Voicemaster hub set to <#${hub.id}>.`)] });
  },
};
