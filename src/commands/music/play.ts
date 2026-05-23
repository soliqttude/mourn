import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "play",
  aliases: ["p"],
  description: "Play a song or playlist in your voice channel.",
  category: "music",
  guildOnly: true,
  usage: "play [song name or url]",
  examples: ["play never gonna give you up", "play https://youtube.com/watch?v=..."],
  options: [{ name: "query", description: "Song name or URL", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    const member = ctx.member;
    const vc = (member as any).voice?.channel;
    if (!vc || vc.type !== ChannelType.GuildVoice) {
      return ctx.reply({ embeds: [errorEmbed("you need to be in a voice channel.")] });
    }
    if (!await hasDjPermission(ctx.guild.id, member)) {
      return ctx.reply({ embeds: [errorEmbed("you need the dj role to use music commands.")] });
    }
    const query = ctx.getString("query", true)!;
    await ctx.defer();
    try {
      await distube.play(vc, query, { member, textChannel: ctx.channel as any });
    } catch (err: any) {
      return ctx.reply({ embeds: [errorEmbed(err?.message ?? "failed to play that song.")] });
    }
  },
};
