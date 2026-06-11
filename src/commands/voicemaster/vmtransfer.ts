import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmtransfer",
  aliases: ["vtransfer"],
  description: "Transfer ownership of your voice channel to another member.",
  usage: "vmtransfer [user]",
  examples: ["vmtransfer @user"],
  category: "voicemaster",
  guildOnly: true,
  options: [{ name: "user", description: "New owner", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("You must be in a voice **channel**.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You don't own this voice **channel**.")] });
    const target = await ctx.getUser("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**User** not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You already own this **channel**.")] });
    if (!vc.members.has(target.id)) return ctx.reply({ embeds: [errorEmbed("That **user** must be in your **channel**.")] });
    await db.update(voicemasterChannels).set({ ownerId: target.id }).where(eq(voicemasterChannels.channelId, vc.id));
    return ctx.reply({ embeds: [successEmbed(`transferred ownership to **${target.username}**.`)] });
  },
};