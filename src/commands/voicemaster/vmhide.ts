import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmhide",
  aliases: ["vmghost"],
  description: "Hide your voice channel from everyone.",
  usage: "vmhide",
  examples: ["vmhide"],
  category: "voicemaster",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("You must be in a voice **channel**.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You don't own this voice **channel**.")] });
    await vc.permissionOverwrites.edit(ctx.guild.roles.everyone, { ViewChannel: false });
    return ctx.reply({ embeds: [successEmbed("Voice **channel** hidden.")] });
  },
};