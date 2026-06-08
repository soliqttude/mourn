import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "lyrics",
  description: "Fetch lyrics for a song.",
  category: "utility",
  aliases: ["songlyrics", "lyric"],
  options: [
    { name: "song", description: "Song name", type: ApplicationCommandOptionType.String, required: true },
    { name: "artist", description: "Artist name", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const song = ctx.getString("song") ?? ctx.args[0];
    const artist = ctx.getString("artist") ?? ctx.args[1] ?? "";
    if (!song) return ctx.reply({ content: "Provide a song name.", ephemeral: true } as any);
    const q = encodeURIComponent(artist ? `${artist} ${song}` : song);
    try {
      const res = await fetch(`https://lyrist.vercel.app/api/${q}`);
      const data = await res.json() as any;
      if (!data.lyrics) throw new Error("No lyrics");
      const lines = data.lyrics.split("\n").slice(0, 40).join("\n");
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🎵 ${data.title ?? song}`).setDescription(lines.slice(0,2000)).setThumbnail(data.image ?? null).setFooter({ text: `${data.artist ?? "Unknown"} • ${config.embedFooter}` }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`Lyrics not found for **${song}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
