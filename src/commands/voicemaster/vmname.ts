import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "vmname",
  description: "Rename your voicemaster channel.",
  usage: "vmname [name]",
  examples: ["vmname"],
  category: "voicemaster",
  guildOnly: true,
  options: [
    { name: "name", description: "New name", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    const name = ctx.getString("name", true);
    if (!name) return;
    const vc = ctx.member.voice.channel;
    if (!vc) return ctx.reply({ embeds: [errorEmbed("Join your voicemaster **channel** first.")] });
    const rows = await db
      .select()
      .from(voicemasterChannels)
      .where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) {
      return ctx.reply({ embeds: [errorEmbed("Only the **channel** owner can rename it.")] });
    }
    try {
      await vc.setName(name.slice(0, 100));
      return ctx.reply({ embeds: [successEmbed(`Renamed to **${name}**.`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
