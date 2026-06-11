import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmunmuteall",
  aliases: ["vunmuteall"],
  description: "Unmute all members in your voice channel.",
  usage: "vmunmuteall",
  examples: ["vmunmuteall"],
  category: "voicemaster",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("You must be in a voice **channel**.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You don't own this voice **channel**.")] });
    const members = [...vc.members.values()];
    await Promise.all(members.map(m => m.voice.setMute(false).catch(() => {})));
    return ctx.reply({ embeds: [successEmbed(`unmuted **${members.length}** members.`)] });
  },
};