import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "firstmessage",
  description: "Jump link to the first message in a channel.",
  category: "utility",
  guildOnly: true,
  aliases: ["firstmsg"],
  options: [{ name: "channel", description: "Channel (defaults to current)", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel") ?? ctx.channel;
    if (!ch) return;
    const msgs = await (ctx.guild.channels.cache.get(ch.id) as any)?.messages?.fetch({ limit: 1, after: "0" }).catch(() => null);
    const msg = msgs?.first();
    if (!msg) return ctx.reply({ embeds: [brandEmbed({ description: "Couldn't find the first message.", page: "Utility" })] });
    return ctx.reply({
      embeds: [brandEmbed({
        title: "First Message",
        description: `[Jump to first message](${msg.url})\nSent by **${msg.author.tag}** <t:${Math.floor(msg.createdTimestamp / 1000)}:R>`,
        page: "Utility",
      })],
    });
  },
};
