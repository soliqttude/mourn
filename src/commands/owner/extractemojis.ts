import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "extractemojis",
  description: "(Owner) List all emojis from a guild with download URLs.",
  category: "owner",
  ownerOnly: true,
  aliases: ["emojiextract", "stealemojis"],
  options: [
    { name: "guild_id", description: "Guild ID (defaults to current)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id") ?? ctx.args[0] ?? ctx.guild?.id;
    if (!guildId) return ctx.reply({ embeds: [errorEmbed("No guild ID.")] });

    const guild = ctx.client.guilds.cache.get(guildId) ?? await ctx.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return ctx.reply({ embeds: [errorEmbed("Bot is not in that guild or guild not found.")] });

    await (guild as any).emojis.fetch().catch(() => {});
    const emojis = guild.emojis.cache;
    if (!emojis.size) return ctx.reply({ content: `No emojis in **${guild.name}**.` });

    const lines = emojis.map(e =>
      `${e.animated ? "GIF" : "PNG"} \`${e.name}\` — [download](${e.imageURL()})`
    );

    const chunks: string[] = [];
    let current = "";
    for (const line of lines) {
      if (current.length + line.length > 3800) { chunks.push(current); current = ""; }
      current += line + "\n";
    }
    if (current) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
      const eb = new EmbedBuilder()
        .setColor(0x0f1923)
        .setTitle(i === 0 ? `😀 Emojis — ${guild.name} (${emojis.size})` : `😀 Emojis cont. (${i + 1}/${chunks.length})`)
        .setDescription(chunks[i]!);
      await ctx.reply({ embeds: [eb], ephemeral: true } as any);
    }
  },
};
