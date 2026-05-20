import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmforbid",
  aliases: ["vforbid", "vmdeny"],
  description: "Forbid a member from joining your voice channel.",
  usage: "vmforbid [user]",
  examples: ["vmforbid @user"],
  category: "voicemaster",
  guildOnly: true,
  options: [{ name: "user", description: "User to forbid", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("you must be in a voice channel.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you don't own this voice channel.")] });
    const target = await ctx.getUser("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("user not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't forbid yourself.")] });
    await vc.permissionOverwrites.edit(target.id, { Connect: false });
    const member = ctx.guild.members.cache.get(target.id);
    if (member?.voice.channelId === vc.id) await member.voice.disconnect().catch(() => {});
    return ctx.reply({ embeds: [successEmbed(`forbidden **${target.username}** from your channel.`)] });
  },
};