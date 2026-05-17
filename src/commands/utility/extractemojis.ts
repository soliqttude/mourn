import { Message, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed } from "../../lib/embeds.js";

const EMOJI_RE = /<(a?):(\w{2,32}):(\d{17,19})>/g;

export const command: HybridCommand = {
  name: "extractemojis",
  description: "Reply to a message to steal all its custom emojis and add them here.",
  usage: "extractemojis",
  examples: ["extractemojis"],
  category: "utility",
  guildOnly: true,
  aliases: ["stealemojis", "masssteal", "bulksteal"],

  async execute(ctx) {
    if (!ctx.guild) return;

    const member = ctx.member;
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ embeds: [errorEmbed("You need **Manage Emojis** permission to use this.")] });
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ embeds: [errorEmbed("I need **Manage Emojis** permission in this server.")] });
    }

    const msg = ctx.raw as Message;
    const refId = msg.reference?.messageId;

    if (!refId) {
      return ctx.reply({ embeds: [errorEmbed("**Reply** to a message that has custom emojis, then run this command.")] });
    }

    const referenced = await msg.channel.messages.fetch(refId).catch(() => null);
    if (!referenced) {
      return ctx.reply({ embeds: [errorEmbed("Couldn't load that message.")] });
    }

    const text = referenced.content;
    const found = new Map<string, { name: string; id: string; animated: boolean }>();
    for (const [, a, name, id] of text.matchAll(new RegExp(EMOJI_RE.source, "g"))) {
      if (id && !found.has(id)) {
        found.set(id, { name: name!, id, animated: a === "a" });
      }
    }

    if (!found.size) {
      return ctx.reply({ embeds: [errorEmbed("No custom emojis found in that message. Make sure the message contains emojis like `<:name:id>`.")] });
    }

    await ctx.reply({
      embeds: [brandEmbed({
        description: `⏳ Found **${found.size}** emoji${found.size === 1 ? "" : "s"} — stealing them now...`,
        page: "Utility",
      })],
    });

    const added: string[] = [];
    const failed: string[] = [];

    for (const { name, id, animated } of found.values()) {
      const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
      try {
        const emoji = await ctx.guild.emojis.create({ attachment: url, name });
        added.push(`${emoji} \`:${emoji.name}:\``);
      } catch (e: any) {
        failed.push(`\`:${name}:\` (${e?.message ?? "unknown error"})`);
      }
    }

    const fields: { name: string; value: string }[] = [];

    if (added.length) {
      const chunks: string[] = [];
      let chunk = "";
      for (const line of added) {
        if (chunk.length + line.length + 2 > 1000) { chunks.push(chunk.trimEnd()); chunk = ""; }
        chunk += line + "  ";
      }
      if (chunk) chunks.push(chunk.trimEnd());
      fields.push({ name: `✅ Added (${added.length})`, value: chunks[0]! });
      for (let i = 1; i < chunks.length; i++) fields.push({ name: "\u200b", value: chunks[i]! });
    }

    if (failed.length) {
      fields.push({ name: `❌ Failed (${failed.length})`, value: failed.slice(0, 10).join("\n") });
    }

    return ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(added.length ? 0x57F287 : 0xED4245)
          .setTitle(`Emoji Steal — ${ctx.guild.name}`)
          .addFields(fields)
          .setFooter({ text: "Bleed  ·  Utility" })
          .setTimestamp(),
      ],
    });
  },
};
