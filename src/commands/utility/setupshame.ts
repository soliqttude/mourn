import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Message,
  EmbedBuilder,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
import { extractId } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "setupshame",
  description: "Set the shame channel — messages that get 3+ 😭 or 💀 reactions get posted there.",
  category: "utility",
  guildOnly: true,
  aliases: ["shamechannel", "setshame"],
  options: [
    {
      name: "channel",
      description: "Text channel to post shamed messages in",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
    {
      name: "threshold",
      description: "Number of reactions needed (default 3)",
      type: ApplicationCommandOptionType.Number,
      required: false,
    },
  ],

  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;

    const member = ctx.member;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ embeds: [errorEmbed("You need **Manage Server** permission.")] });
    }

    // Resolve channel — works for both slash and prefix
    let targetChannel: any = null;
    if (ctx.source === "slash") {
      targetChannel = ctx.getChannel("channel");
    } else {
      const raw = ctx.args[0];
      if (raw) {
        const id = extractId(raw) ?? raw.replace(/^#/, "");
        targetChannel =
          ctx.guild.channels.cache.get(id) ??
          ctx.guild.channels.cache.find(c => c.name.toLowerCase() === id.toLowerCase()) ??
          null;
      }
    }

    if (!targetChannel) return ctx.reply({ embeds: [errorEmbed("Please mention a text channel.")] });
    if (!targetChannel.isTextBased?.()) return ctx.reply({ embeds: [errorEmbed("That must be a text channel.")] });

    const threshold = ctx.getNumber("threshold") ?? 3;

    await updateGuildSettings(ctx.guild.id, {
      shameChannel: targetChannel.id,
      shameThreshold: threshold,
    });

    if (ctx.source === "prefix") {
      const msg = ctx.raw as Message;
      await msg.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0x111116)
      .setDescription(
        `💀 shame channel set to <#${targetChannel.id}>\n` +
        `messages with **${threshold}+** 😭 or 💀 reactions will be posted there`
      );

    await (ctx.channel as any).send({ embeds: [embed] });
  },
};
