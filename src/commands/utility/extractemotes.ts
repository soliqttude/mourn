import { AttachmentBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "extractemotes",
  aliases: ["extractemojis", "emoteexport"],
  description: "Download all server emojis as a ZIP archive.",
  category: "utility",
  permission: "administrator",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const emojis = await ctx.guild.emojis.fetch();
    if (!emojis.size) return ctx.reply({ embeds: [errorEmbed("This server has no custom emojis.")] });

    await ctx.defer?.();
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    let exported = 0;

    for (const [, emoji] of emojis) {
      try {
        const extension = emoji.animated ? "gif" : "png";
        const response = await fetch(emoji.imageURL({ extension, size: 4096 }), { signal: AbortSignal.timeout(8000) });
        if (!response.ok) continue;
        const bytes = Buffer.from(await response.arrayBuffer());
        zip.file(`${emoji.name ?? emoji.id}-${emoji.id}.${extension}`, bytes);
        exported++;
      } catch {
        // Continue exporting the remaining emojis if one asset fails.
      }
    }

    if (!exported) return ctx.reply({ embeds: [errorEmbed("Couldn't download any server emojis.")] });
    const archive = await zip.generateAsync({ type: "nodebuffer" });
    const attachment = new AttachmentBuilder(archive, { name: `${ctx.guild.name}-emotes.zip` });
    return ctx.reply({ content: `exported **${exported}** custom emoji${exported === 1 ? "" : "s"}.`, files: [attachment] });
  },
};
