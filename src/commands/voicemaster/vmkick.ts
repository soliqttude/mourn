import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmkick",
  aliases: ["vkick"],
  description: "Kick a member from your voice channel.",
  usage: "vmkick [user]",
  examples: ["vmkick @user"],
  category: "voicemaster",
  guildOnly: true,
  options: [{ name: "user", description: "User to kick", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("you must be in a voice channel.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you don't own this voice channel.")] });
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("member not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't kick yourself.")] });
    if (target.voice.channelId !== vc.id) return ctx.reply({ embeds: [errorEmbed("that member isn't in your channel.")] });
    await target.voice.disconnect().catch(() => {});
    return ctx.reply({ embeds: [successEmbed(`kicked **${target.user.username}** from your channel.`)] });
  },
};