import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmclaim",
  aliases: ["vclaim"],
  description: "Claim ownership of an abandoned voice channel.",
  usage: "vmclaim",
  examples: ["vmclaim"],
  category: "voicemaster",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("You must be in a voice **channel**.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0]) return ctx.reply({ embeds: [errorEmbed("This isn't a voicemaster **channel**.")] });
    if (rows[0].ownerId === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You already own this **channel**.")] });
    if (vc.members.has(rows[0].ownerId)) return ctx.reply({ embeds: [errorEmbed("The owner is still in the **channel**.")] });
    await db.update(voicemasterChannels).set({ ownerId: ctx.user.id }).where(eq(voicemasterChannels.channelId, vc.id));
    return ctx.reply({ embeds: [successEmbed("You now own this voice **channel**.")] });
  },
};