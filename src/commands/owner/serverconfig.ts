import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "serverconfig",
  description: "(Owner) Dump the full settings for any server by ID.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID to inspect", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id", true)!;
    const guild = ctx.client.guilds.cache.get(guildId);
    const settings = await getGuildSettings(guildId);

    const lines = Object.entries(settings)
      .filter(([k]) => k !== "guildId" && k !== "createdAt")
      .map(([k, v]) => {
        const val = v === null || v === undefined ? "_not set_" : typeof v === "boolean" ? (v ? "✅" : "❌") : `\`${v}\``;
        return `**${k}**: ${val}`;
      });

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle(`⚙️ config — ${guild?.name ?? guildId}`)
          .setDescription(lines.join("\n").slice(0, 4000))
          .setFooter({ text: config.embedFooter })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
