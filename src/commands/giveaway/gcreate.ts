import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { createGiveaway } from "../../features/giveaway.js";

export const command: HybridCommand = {
  name: "gcreate",
  aliases: ["gstart"],
  description: "Start a giveaway in the current or specified channel.",
  category: "giveaway",
  permission: "mod",
  guildOnly: true,
  usage: "gcreate (prize) (duration) [winners] [--channel #ch] [--desc text] [--thumb url] [--roles @r1,@r2] [--minlevel n] [--maxlevel n]",
  examples: [
    "gcreate Nitro Classic 24h 1",
    "gcreate \"Discord Nitro\" 2h 3 --desc Must be level 5+",
  ],
  options: [
    { name: "prize", description: "What are you giving away?", type: ApplicationCommandOptionType.String, required: true },
    { name: "duration", description: "How long? e.g. 1h, 30m, 1d", type: ApplicationCommandOptionType.String, required: true },
    { name: "winners", description: "Number of winners (default 1)", type: ApplicationCommandOptionType.Number, required: false },
    { name: "channel", description: "Channel to post in (defaults to current)", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "description", description: "Extra description / requirements text", type: ApplicationCommandOptionType.String, required: false },
    { name: "thumbnail", description: "Thumbnail image URL", type: ApplicationCommandOptionType.String, required: false },
    { name: "image", description: "Main image URL", type: ApplicationCommandOptionType.String, required: false },
    { name: "minlevel", description: "Minimum level required to enter", type: ApplicationCommandOptionType.Number, required: false },
    { name: "maxlevel", description: "Maximum level allowed to enter", type: ApplicationCommandOptionType.Number, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const prize = ctx.getString("prize", true)!;
    const durStr = ctx.getString("duration", true)!;
    const winnersCount = ctx.getNumber("winners") ?? 1;
    const channel = ctx.getChannel("channel") ?? ctx.channel;
    if (!channel) return ctx.reply({ embeds: [errorEmbed("no channel found.")] });
    const ms = parseDuration(durStr);
    if (!ms || ms < 10_000) return ctx.reply({ embeds: [errorEmbed("invalid duration. minimum is 10 seconds.")] });
    const endsAt = new Date(Date.now() + ms);

    await ctx.defer();

    const id = await createGiveaway(
      ctx.client, guild.id, channel.id, ctx.user.id, prize, Math.floor(winnersCount), endsAt,
      {
        description: ctx.getString("description") ?? undefined,
        thumbnail: ctx.getString("thumbnail") ?? undefined,
        imageUrl: ctx.getString("image") ?? undefined,
        minLevel: ctx.getNumber("minlevel") ?? undefined,
        maxLevel: ctx.getNumber("maxlevel") ?? undefined,
      }
    );

    return ctx.reply({ embeds: [successEmbed(`giveaway #${id} started in <#${channel.id}>!`, "giveaway")] });
  },
};
