import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed, brandEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "volume",
  aliases: ["vol", "v"],
  description: "Set the playback volume (1–200).",
  category: "music",
  guildOnly: true,
  usage: "volume [1-200]",
  options: [{ name: "amount", description: "Volume 1-200", type: ApplicationCommandOptionType.Number, required: false }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("Nothing is playing.")] });
    const amount = ctx.getNumber("amount");
    if (amount === null) {
      return ctx.reply({ embeds: [brandEmbed({ description: `current volume: **${queue.volume}%**` })] });
    }
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("You need the dj **role**.")] });
    if (amount < 1 || amount > 200) return ctx.reply({ embeds: [errorEmbed("Volume must be between 1 and 200.")] });
    queue.setVolume(amount);
    return ctx.reply({ embeds: [successEmbed(`volume set to **${amount}%**.`)] });
  },
};
