import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vminvite",
  aliases: ["vinvite"],
  description: "Send a voice channel invite to a member.",
  usage: "vminvite [user]",
  examples: ["vminvite @user"],
  category: "voicemaster",
  guildOnly: true,
  options: [{ name: "user", description: "User to invite", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("You must be in a voice **channel**.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You don't own this voice **channel**.")] });
    const target = await ctx.getUser("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**User** not found.")] });
    const invite = await vc.createInvite({ maxAge: 3600, maxUses: 1 }).catch(() => null);
    if (!invite) return ctx.reply({ embeds: [errorEmbed("Could not create an **invite**.")] });
    await target.send(`you've been invited to join **${vc.name}**: ${invite.url}`).catch(() => {});
    return ctx.reply({ embeds: [successEmbed(`invited **${target.username}** to your channel.`)] });
  },
};