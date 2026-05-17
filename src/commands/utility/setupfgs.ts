import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
  Message,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "setupfgs",
  description: "Post the FGS requirements & benefits embed.",
  usage: "setupfgs [channel] [ticket_channel]",
  examples: ["setupfgs"],
  category: "utility",
  guildOnly: true,
  aliases: ["fgs"],
  options: [
    {
      name: "channel",
      description: "Channel to post in (defaults to current)",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: "ticket_channel",
      description: "Ticket/help channel to link at the bottom",
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
    const ticketChannel = ctx.getChannel("ticket_channel");
    const ticketStr = ticketChannel ? `<#${ticketChannel.id}>` : `#・help`;

    const description = [
      `**Requirements**`,
      ``,
      `· must be active`,
      `· in total of 4+ members`,
      ``,
      `**Benefits**`,
      ``,
      `· custom group role`,
      `· chance at high roles (if active)`,
      `make a ticket in ${ticketStr} for more info`,
    ].join("\n");

    const embed = new EmbedBuilder()
      .setTitle("FGS 🫂")
      .setDescription(description)
      .setColor(0x111116);

    const ch = ctx.guild.channels.cache.get(targetChannel.id) as any;
    if (!ch?.isTextBased()) {
      return ctx.reply({ embeds: [errorEmbed("That channel isn't a text channel.")] });
    }

    if (ctx.source === "prefix") {
      const msg = ctx.raw as Message;
      await msg.delete().catch(() => {});
    }

    await ch.send({ embeds: [embed] });
  },
};
