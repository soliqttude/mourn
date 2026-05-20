import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmbitrate",
  aliases: ["vbitrate"],
  description: "Set the bitrate of your voice channel (8-384 kbps).",
  usage: "vmbitrate [kbps]",
  examples: ["vmbitrate 64"],
  category: "voicemaster",
  guildOnly: true,
  options: [{ name: "kbps", description: "Bitrate in kbps (8–384)", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("you must be in a voice channel.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you don't own this voice channel.")] });
    const kbps = ctx.getNumber("kbps", true);
    if (!kbps || kbps < 8 || kbps > 384) return ctx.reply({ embeds: [errorEmbed("bitrate must be between 8 and 384 kbps.")] });
    await vc.setBitrate(kbps * 1000).catch(() => {});
    return ctx.reply({ embeds: [successEmbed(`bitrate set to **${kbps}kbps**.`)] });
  },
};