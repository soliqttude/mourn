import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmreveal",
  aliases: ["vreveal"],
  description: "Reveal your hidden voice channel.",
  usage: "vmreveal",
  examples: ["vmreveal"],
  category: "voicemaster",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("you must be in a voice channel.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you don't own this voice channel.")] });
    await vc.permissionOverwrites.edit(ctx.guild.roles.everyone, { ViewChannel: null });
    return ctx.reply({ embeds: [successEmbed("voice channel revealed.")] });
  },
};