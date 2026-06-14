import { AttachmentBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "extractstickers",
  description: "Download all server stickers as a zip file.",
  category: "utility",
  permission: "manage_expressions",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const stickers = await ctx.guild.stickers.fetch();
    if (!stickers.size) return ctx.reply({ embeds: [errorEmbed("This server has no stickers.")] });

    await ctx.defer?.();

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const [, sticker] of stickers) {
      try {
        const ext = sticker.format === 3 ? "json" : sticker.format === 1 ? "png" : "apng";
        const url = sticker.url;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        zip.file(`${sticker.name}.${ext}`, buf);
      } catch { /* skip failed */ }
    }

    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
    const attachment = new AttachmentBuilder(zipBuf, { name: `${ctx.guild.name}-stickers.zip` });

    return ctx.reply({ content: `exported **${stickers.size}** sticker${stickers.size === 1 ? "" : "s"}.`, files: [attachment] });
  },
};
