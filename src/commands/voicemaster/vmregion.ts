import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { voicemasterChannels } from "../../db/schema.js";

const REGIONS = ["brazil","hongkong","india","japan","rotterdam","russia","singapore","southafrica","sydney","us-central","us-east","us-south","us-west","automatic"];

export const command: HybridCommand = {
  name: "vmregion",
  aliases: ["vregion"],
  description: "Set the region override for your voice channel.",
  usage: "vmregion [region]",
  examples: ["vmregion us-east", "vmregion automatic"],
  category: "voicemaster",
  guildOnly: true,
  options: [{ name: "region", description: "Region (or 'automatic')", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member?.voice.channel) return ctx.reply({ embeds: [errorEmbed("you must be in a voice channel.")] });
    const vc = ctx.member.voice.channel;
    const rows = await db.select().from(voicemasterChannels).where(eq(voicemasterChannels.channelId, vc.id));
    if (!rows[0] || rows[0].ownerId !== ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you don't own this voice channel.")] });
    const region = ctx.getString("region", true)?.toLowerCase();
    if (!region || !REGIONS.includes(region)) return ctx.reply({ embeds: [errorEmbed(`invalid region. valid options: ${REGIONS.join(", ")}.`)] });
    await vc.setRTCRegion(region === "automatic" ? null : region).catch(() => {});
    return ctx.reply({ embeds: [successEmbed(`region set to **${region}**.`)] });
  },
};