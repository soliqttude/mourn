import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "lyrics",
  aliases: ["lyr", "song", "songlyrics"], description: "Find song lyrics (format: Artist - Song Title).", category: "utility",
  options: [{ name: "song", description: "Artist - Song Title (e.g. Drake - God's Plan)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const query = ctx.getString("song", true) ?? ctx.rawArgs;
    if (!query) return ctx.reply({ embeds: [errorEmbed("Usage: `,lyrics Artist - Song Title`")] });
    const parts = query.split(/\s*-\s*/);
    if (parts.length < 2) return ctx.reply({ embeds: [errorEmbed("Please format as: **Artist - Song Title**\nExample: `,lyrics The Weeknd - Blinding Lights`")] });
    const artist = parts[0]!.trim();
    const title = parts.slice(1).join("-").trim();
    await ctx.defer();
    try {
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (!res.ok) return ctx.reply({ embeds: [errorEmbed(`Lyrics not found for **${artist} - ${title}**.`)] });
      const data = await res.json() as any;
      const lyr = (data.lyrics ?? "").trim();
      if (!lyr) return ctx.reply({ embeds: [errorEmbed("No lyrics found.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: `🎵 ${artist} — ${title}`, description: lyr.slice(0, 3900), page: "Lyrics" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Could not fetch lyrics right now.")] }); }
  },
};
