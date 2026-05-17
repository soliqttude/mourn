import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Message,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { vmInterfaceEmbed, vmInterfaceRows } from "../../features/voicemaster.js";

export const command: HybridCommand = {
  name: "setupinterface",
  description: "Post the VoiceMaster control interface to a channel.",
  usage: "setupinterface [channel]",
  examples: ["setupinterface"],
  category: "utility",
  guildOnly: true,
  aliases: ["vminterface", "voiceinterface"],
  options: [
    {
      name: "channel",
      description: "Channel to post in (defaults to current)",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
  ],

  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;

    const member = ctx.member;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ embeds: [errorEmbed("You need **Manage Server** permission to use this.")] });
    }

    const targetChannel = ctx.getChannel("channel") ?? ctx.channel;
    const ch = ctx.guild.channels.cache.get(targetChannel.id) as any;
    if (!ch?.isTextBased()) {
      return ctx.reply({ embeds: [errorEmbed("That channel isn't a text channel.")] });
    }

    const embed = vmInterfaceEmbed(ctx.guild as any);
    const rows = vmInterfaceRows();

    if (ctx.source === "prefix") {
      const msg = ctx.raw as Message;
      await msg.delete().catch(() => {});
    }

    await ch.send({
      embeds: [embed],
      components: rows,
    });
  },
};
