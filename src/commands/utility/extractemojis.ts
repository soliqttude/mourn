import { Message, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed, brandEmbed } from "../../lib/embeds.js";

const EMOJI_REGEX = /<(a?):(\w{2,32}):(\d{17,19})>/g;

export const command: HybridCommand = {
  name: "extractemojis",
  description: "Reply to a message to steal all its custom emojis and add them to this server.",
  category: "utility",
  permission: "admin",
  guildOnly: true,
  noSlash: true,
  aliases: ["stealemojis", "masssteal"],
  async execute(ctx) {
    if (!ctx.guild) return;

    if (ctx.source !== "prefix") {
      return ctx.reply({ embeds: [errorEmbed("This command only works as a prefix command. Reply to a message and run `,extractemojis`.")] });
    }

    const msg = ctx.raw as Message;
    if (!msg.reference?.messageId) {
      return ctx.reply({ embeds: [errorEmbed("You need to **reply** to a message that contains custom emojis.")] });
    }

    const referenced = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
    if (!referenced) {
      return ctx.reply({ embeds: [errorEmbed("Couldn't fetch the replied message.")] });
    }

    const content = referenced.content;
    const matches = [...content.matchAll(EMOJI_REGEX)];

    if (!matches.length) {
      return ctx.reply({ embeds: [errorEmbed("No custom emojis found in that message.")] });
    }

    const unique = new Map<string, { name: string; id: string; animated: boolean }>();
    for (const [, animated, name, id] of matches) {
      if (!unique.has(id!)) {
        unique.set(id!, { name: name!, id: id!, animated: animated === "a" });
      }
    }

    await ctx.reply({
      embeds: [
        brandEmbed({
          description: `⏳ Found **${unique.size}** emoji${unique.size === 1 ? "" : "s"} — adding to **${ctx.guild.name}**...`,
          page: "Utility",
        }),
      ],
    });

    const added: string[] = [];
    const failed: string[] = [];

    for (const { name, id, animated } of unique.values()) {
      const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
      try {
        const emoji = await ctx.guild.emojis.create({ attachment: url, name });
        added.push(`${emoji} \`:${emoji.name}:\``);
      } catch {
        failed.push(`\`:${name}:\``);
      }
    }

    const fields: { name: string; value: string; inline?: boolean }[] = [];

    if (added.length) {
      const chunks: string[] = [];
      let chunk = "";
      for (const line of added) {
        if (chunk.length + line.length + 2 > 1000) { chunks.push(chunk.trimEnd()); chunk = ""; }
        chunk += line + "  ";
      }
      if (chunk) chunks.push(chunk.trimEnd());
      fields.push({ name: `✅ Added (${added.length})`, value: chunks[0]! });
      for (let i = 1; i < chunks.length; i++) {
        fields.push({ name: "\u200b", value: chunks[i]! });
      }
    }

    if (failed.length) {
      fields.push({ name: `❌ Failed (${failed.length})`, value: failed.join(", ") });
    }

    return ctx.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(added.length ? 0x57F287 : 0xED4245)
          .setTitle(`Emoji Extraction — ${ctx.guild.name}`)
          .addFields(fields)
          .setFooter({ text: `Mourn  ·  Utility` })
          .setTimestamp(),
      ],
    });
  },
};
