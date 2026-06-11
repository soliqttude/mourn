import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
  Message,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "setupboosterperks",
  description: "Post the booster perks embed to a channel.",
  usage: "setupboosterperks [channel] [role]",
  examples: ["setupboosterperks"],
  category: "utility",
  guildOnly: true,
  aliases: ["boosterperks", "boostperks"],
  options: [
    {
      name: "channel",
      description: "Channel to post in (defaults to current)",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: "role",
      description: "Booster role to mention in the perks (e.g. @bank)",
      type: ApplicationCommandOptionType.Role,
      required: false,
    },
  ],

  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;

    const member = ctx.member;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ embeds: [errorEmbed("You need **Manage Server** **permission** to use this.")] });
    }

    const targetChannel = ctx.getChannel("channel") ?? ctx.channel;
    const boostRole = ctx.getRole("role");
    const roleStr = boostRole ? `<@&${boostRole.id}> role` : `booster role`;

    const description = [
      `🛡️ __**1x boost**__`,
      ``,
      `· ${roleStr}`,
      `· instant pic perms + vc perms`,
      `· 2x giveaway entry`,
      `· custom role`,
      ``,
      `→`,
      `\`,br create (name)\``,
      `\`,br color (#hex) ,(example: ,br color #000000)\``,
      `\`,br icon (icon or emoji of your choice)\``,
    ].join("\n");

    const embed = new EmbedBuilder()
      .setDescription(description)
      .setColor(0x111116);

    const ch = ctx.guild.channels.cache.get(targetChannel.id) as any;
    if (!ch?.isTextBased()) {
      return ctx.reply({ embeds: [errorEmbed("That **channel** isn't a text **channel**.")] });
    }

    if (ctx.source === "prefix") {
      const msg = ctx.raw as Message;
      await msg.delete().catch(() => {});
    } else {
      await ctx.reply({ embeds: [errorEmbed("✅ Posting **booster** perks...")], ephemeral: true } as any);
    }

    await ch.send({
      content: `(ᴗ-#) ✦ **booster perks**`,
      embeds: [embed],
    });
  },
};
