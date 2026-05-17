import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "remoteprefix",
  description: "(Owner) Change the prefix for any server by ID.",
  usage: "remoteprefix [guild_id] [prefix]",
  examples: ["remoteprefix"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID to update", type: ApplicationCommandOptionType.String, required: true },
    { name: "prefix", description: "New prefix", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id", true)!;
    const prefix = ctx.getString("prefix", true)!;
    if (prefix.length > 5) return ctx.reply({ embeds: [errorEmbed("prefix max 5 characters.")] });

    const guild = ctx.client.guilds.cache.get(guildId);
    await updateGuildSettings(guildId, { prefix });

    return ctx.reply({
      embeds: [successEmbed(`prefix for **${guild?.name ?? guildId}** set to \`${prefix}\`.`)],
      ephemeral: true,
    });
  },
};
