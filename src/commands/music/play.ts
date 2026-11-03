import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed, EMOJIS } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";
import { logger } from "../../lib/logger.js";

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
      return ctx.reply({ embeds: [errorEmbed("You need to be in a voice **channel**.")] });
    }
    if (!await hasDjPermission(ctx.guild.id, member)) {
      return ctx.reply({ embeds: [errorEmbed("You need the dj **role** to use music **commands**.")] });
    }

    const query = ctx.getString("query", true)!;
    const guildId = ctx.guild.id;
    logger.info({ guildId, userId: ctx.user.id, voiceChannelId: vc.id, query }, "Music play command received");

    if (!distube) {
      logger.error({ guildId }, "Music play requested before DisTube initialization");
      return ctx.reply({ embeds: [errorEmbed("The music player is still starting. Try again in a few seconds.")] });
    }

    await ctx.defer();
    try {
      await distube.play(vc, query, { member, textChannel: ctx.channel as any });
      const label = query.length > 80 ? query.slice(0, 80) + "…" : query;
      await ctx.reply({ embeds: [brandEmbed({ description: `${EMOJIS.loading} searching **${label}**…` })] });
    } catch (err: any) {
      logger.error({ err, guildId, query }, "Music play command failed");
      return ctx.reply({ embeds: [errorEmbed(err?.message ?? "failed to play that song.")] });
    }
  },
};
