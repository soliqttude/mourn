import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmlimit",
  description: "Set user limit for your voicemaster channel.",
  category: "voicemaster",
  guildOnly: true,
  options: [
    { name: "limit", description: "User limit (0 = unlimited, max 99)", type: ApplicationCommandOptionType.Number, required: true },
  ],
  async execute(ctx) {
    if (!ctx.member) return;
    const limit = ctx.getNumber("limit", true);
    if (limit === null || limit < 0 || limit > 99) {
      return ctx.reply({ embeds: [errorEmbed("Limit must be 0-99.")] });
    }
    const vc = ctx.member.voice.channel;
    if (!vc) return ctx.reply({ embeds: [errorEmbed("Join your voicemaster channel first.")] });
    const rows = await db
      .select()
      .from(voicemasterChannels)
      .where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) {
      return ctx.reply({ embeds: [errorEmbed("Only the channel owner can do this.")] });
    }
    try {
      await vc.setUserLimit(limit);
      return ctx.reply({ embeds: [successEmbed(`User limit set to **${limit}**.`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
