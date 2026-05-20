import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmmuteall",
  aliases: ["vmuteall"],
  description: "Server-mute all members in your voice channel.",
  usage: "vmmuteall",
  examples: ["vmmuteall"],
  category: "voicemaster",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("you must be in a voice channel.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you don't own this voice channel.")] });
    const others = [...vc.members.values()].filter(m => m.id !== ctx.user.id);
    await Promise.all(others.map(m => m.voice.setMute(true).catch(() => {})));
    return ctx.reply({ embeds: [successEmbed(`muted **${others.length}** members.`)] });
  },
};