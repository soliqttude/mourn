import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vminfo",
  aliases: ["vinfo", "vcinfo"],
  description: "View info about your current voice channel.",
  usage: "vminfo",
  examples: ["vminfo"],
  category: "voicemaster",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("You must be in a voice **channel**.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    const owner = rows[0] ? await ctx.guild.members.fetch(rows[0].ownerId).catch(() => null) : null;
    const locked = !vc.permissionsFor(ctx.guild.roles.everyone)?.has("Connect");
    const hidden = !vc.permissionsFor(ctx.guild.roles.everyone)?.has("ViewChannel");
    return ctx.reply({
      embeds: [brandEmbed({
        title: vc.name,
        fields: [
          { name: "owner", value: owner ? `<@${owner.id}>` : "unknown", inline: true },
          { name: "members", value: `${vc.members.size}${vc.userLimit ? `/${vc.userLimit}` : ""}`, inline: true },
          { name: "bitrate", value: `${vc.bitrate / 1000}kbps`, inline: true },
          { name: "locked", value: locked ? "yes" : "no", inline: true },
          { name: "hidden", value: hidden ? "yes" : "no", inline: true },
          { name: "region", value: vc.rtcRegion ?? "automatic", inline: true },
        ],
      })],
    });
  },
};