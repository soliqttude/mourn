import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "fastforward",
  aliases: ["ff"],
  description: "Fast forward to a desired position.",
  category: "music",
  guildOnly: true,
  usage: "fastforward <seconds>",
  examples: ["fastforward 30"],
  options: [{ name:"position",description:"Position in seconds",type:ApplicationCommandOptionType.Number,required:true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    const queue=distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({embeds:[errorEmbed("Nothing is playing.")]});
    if (!await hasDjPermission(ctx.guild.id,ctx.member)) return ctx.reply({embeds:[errorEmbed("You need the DJ **role**.")]});
    const position=ctx.getNumber("position") ?? Number(ctx.args[0]);
    const total=queue.songs[0]?.duration ?? 0;
    if (!Number.isFinite(position) || position < 0 || (total > 0 && position > total)) return ctx.reply({embeds:[errorEmbed("Provide a valid position in seconds.")]});
    await queue.seek(position);
    return ctx.reply({embeds:[successEmbed(`fast forwarded to **${position}s**.`)]});
  },
};