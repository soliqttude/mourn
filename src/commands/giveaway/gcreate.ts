import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { createGiveaway } from "../../features/giveaway.js";

export const command: HybridCommand = {
  name: "gcreate",
  description: "Start a giveaway.",
  category: "giveaway",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "prize", description: "What are you giving away?", type: ApplicationCommandOptionType.String, required: true },
    { name: "duration", description: "How long? e.g. 1h, 30m, 1d", type: ApplicationCommandOptionType.String, required: true },
    { name: "winners", description: "Number of winners (default 1)", type: ApplicationCommandOptionType.Integer, required: false },
    { name: "channel", description: "Channel to post in (defaults to current)", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const prize = ctx.getString("prize", true)!;
    const durStr = ctx.getString("duration", true)!;
    const winnersCount = ctx.getNumber("winners") ?? 1;
    const channel = ctx.getChannel("channel") ?? ctx.channel;
    if (!channel) return ctx.reply({ embeds: [errorEmbed("No channel found.")] });
    const ms = parseDuration(durStr);
    if (!ms || ms < 10_000) return ctx.reply({ embeds: [errorEmbed("Invalid duration. Minimum is 10 seconds.")] });
    const endsAt = new Date(Date.now() + ms);
    await ctx.defer();
    const id = await createGiveaway(ctx.client, guild.id, channel.id, ctx.user.id, prize, winnersCount, endsAt);
    return ctx.reply({ embeds: [successEmbed(`Giveaway #${id} started in <#${channel.id}>!`)] });
  },
};
